import { prisma } from "@/lib/prisma"
import { onSepaTrimestrePaid } from "@/lib/mollie-sepa"
import { isDecennaleContractData, parseJsonObject } from "@/lib/decennale-contract-data"
import {
  buildClientEcheances,
  installmentFromPaymentMetadata,
  type ClientEcheance,
} from "@/lib/client-echeances"

function positiveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", ".").trim())
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return null
}

function attestationAmount(data: string): number {
  const parsed = parseJsonObject(data)
  const trimester = positiveNumber(parsed.primeTrimestrielle)
  if (trimester) return trimester
  const annual = positiveNumber(parsed.primeAnnuelle)
  return annual ? Math.round((annual / 4) * 100) / 100 : 0
}

function annualPremiumFromDocument(data: string): number | null {
  if (!isDecennaleContractData(data)) return null
  return positiveNumber(parseJsonObject(data).primeAnnuelle)
}

export async function loadClientEcheances(userId: string): Promise<ClientEcheance[]> {
  const [subscription, payments, fees, documents] = await Promise.all([
    prisma.sepaSubscription.findUnique({ where: { userId } }),
    prisma.payment.findMany({
      where: { userId },
      select: { status: true, paidAt: true, metadata: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.avenantFee.findMany({
      where: { userId },
      select: { id: true, amount: true, status: true, paidAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.document.findMany({
      where: { userId, type: { in: ["contrat", "attestation", "attestation_nominative"] } },
      select: { id: true, type: true, numero: true, status: true, data: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ])

  let contractPremium: number | null = null
  let contractCreatedAt: Date | null = null
  try {
    const contract = await prisma.insuranceContract.findFirst({
      where: { userId, productType: "decennale" },
      select: { premium: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    })
    if (contract && contract.premium > 0) {
      contractPremium = contract.premium
      contractCreatedAt = contract.createdAt
    }
  } catch {
    contractPremium = null
  }

  const documentPremium = documents
    .map((document) => annualPremiumFromDocument(document.data))
    .find((value): value is number => value != null) ?? null
  const documentAnchor = documents.find((document) => annualPremiumFromDocument(document.data) != null)?.createdAt ?? null

  const explicitPaidInstallments = payments.flatMap((payment) => {
    if (payment.status !== "paid") return []
    const installment = installmentFromPaymentMetadata(payment.metadata)
    if (!installment) return []
    return [{ installment, paidAt: payment.paidAt ?? payment.createdAt }]
  })

  return buildClientEcheances({
    primeAnnuelle: subscription && subscription.primeAnnuelle > 0
      ? subscription.primeAnnuelle
      : documentPremium ?? contractPremium,
    anchorDate: subscription?.firstTrimesterPaidAt ?? documentAnchor ?? contractCreatedAt,
    firstTrimesterPaidAt: subscription?.firstTrimesterPaidAt ?? null,
    trimestresSepaPayes: subscription?.trimestresSepaPayes ?? 0,
    sepaSubscriptionId: subscription?.id ?? null,
    explicitPaidInstallments,
    avenantFees: fees,
    suspendedAttestations: documents
      .filter((document) =>
        (document.type === "attestation" || document.type === "attestation_nominative") &&
        document.status === "suspendu"
      )
      .map((document) => ({
        id: document.id,
        numero: document.numero,
        amount: attestationAmount(document.data),
        createdAt: document.createdAt,
      })),
  })
}

export async function applyEcheancePaidEffects(metadata: Record<string, string>): Promise<void> {
  if (metadata.avenantFeeId) {
    await prisma.avenantFee.updateMany({
      where: { id: metadata.avenantFeeId, status: { not: "paid" } },
      data: { status: "paid", paidAt: new Date() },
    })
  }

  if (metadata.attestationId) {
    await prisma.document.updateMany({
      where: { id: metadata.attestationId, status: "suspendu" },
      data: { status: "valide" },
    })
  }

  const installment = Number(metadata.installmentNumber)
  if (!metadata.sepaSubscriptionId || !Number.isInteger(installment) || installment < 1) return

  const subscription = await prisma.sepaSubscription.findUnique({
    where: { id: metadata.sepaSubscriptionId },
  })
  if (!subscription || subscription.status === "cancelled") return

  const sequentialPaid = (subscription.firstTrimesterPaidAt ? 1 : 0) + Math.max(0, subscription.trimestresSepaPayes)
  if (installment !== sequentialPaid + 1) return

  if (installment === 1) {
    await prisma.sepaSubscription.update({
      where: { id: subscription.id },
      data: { firstTrimesterPaidAt: new Date(), lastError: null },
    })
    return
  }

  await onSepaTrimestrePaid(subscription.id)
}
