import { prisma } from "@/lib/prisma"
import { onSepaTrimestrePaid } from "@/lib/mollie-sepa"
import { isDecennaleContractData, parseJsonObject } from "@/lib/decennale-contract-data"
import {
  attachOpenCardLinks,
  buildClientEcheances,
  installmentFromPaymentMetadata,
  paidAttestationMoments,
  selectEcheancesASuivre,
  type ClientEcheance,
  type EcheanceASuivre,
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

type EcheanceSubscription = {
  id: string
  primeAnnuelle: number
  firstTrimesterPaidAt: Date | null
  trimestresSepaPayes: number
  lastError: string | null
  sepaPendingPaymentId?: string | null
} | null

type EcheancePayment = {
  status: string
  paidAt: Date | null
  metadata: string | null
  createdAt: Date
  molliePaymentId: string
}

type EcheanceFee = { id: string; amount: number; status: string; paidAt: Date | null; createdAt: Date }

type EcheanceDocument = {
  id: string
  type: string
  numero: string
  status: string
  data: string
  createdAt: Date
}

function echeancesFromLoadedRecords(input: {
  subscription: EcheanceSubscription
  payments: EcheancePayment[]
  fees: EcheanceFee[]
  documents: EcheanceDocument[]
  contractPremium: number | null
  contractCreatedAt: Date | null
}): ClientEcheance[] {
  const { subscription, payments, fees, documents, contractPremium, contractCreatedAt } = input
  const documentPremium = documents
    .map((document) => annualPremiumFromDocument(document.data))
    .find((value): value is number => value != null) ?? null
  const documentAnchor = documents.find((document) => annualPremiumFromDocument(document.data) != null)?.createdAt ?? null
  const attestationPaidAt = paidAttestationMoments(payments)
  const explicitPaidInstallments = payments.flatMap((payment) => {
    if (payment.status !== "paid") return []
    const installment = installmentFromPaymentMetadata(payment.metadata)
    if (!installment) return []
    return [{ installment, paidAt: payment.paidAt ?? payment.createdAt }]
  })

  return attachOpenCardLinks(buildClientEcheances({
    primeAnnuelle: subscription && subscription.primeAnnuelle > 0
      ? subscription.primeAnnuelle
      : documentPremium ?? contractPremium,
    anchorDate: subscription?.firstTrimesterPaidAt ?? documentAnchor ?? contractCreatedAt,
    firstTrimesterPaidAt: subscription?.firstTrimesterPaidAt ?? null,
    trimestresSepaPayes: subscription?.trimestresSepaPayes ?? 0,
    sepaSubscriptionId: subscription?.id ?? null,
    sepaLastError: subscription?.lastError ?? null,
    explicitPaidInstallments,
    avenantFees: fees,
    suspendedAttestations: documents.flatMap((document) => {
      const isAttestation = document.type === "attestation" || document.type === "attestation_nominative"
      if (!isAttestation) return []
      const paidAt = attestationPaidAt.get(document.id) ?? null
      const paid = paidAt != null
      if (document.status !== "suspendu" && !paid) return []
      return [{
        id: document.id,
        numero: document.numero,
        amount: attestationAmount(document.data),
        createdAt: document.createdAt,
        paid,
        paidAt,
      }]
    }),
  }), payments)
}

export async function loadClientEcheances(userId: string): Promise<ClientEcheance[]> {
  const [subscription, payments, fees, documents] = await Promise.all([
    prisma.sepaSubscription.findUnique({ where: { userId } }),
    prisma.payment.findMany({
      where: { userId },
      select: { status: true, paidAt: true, metadata: true, createdAt: true, molliePaymentId: true },
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

  return echeancesFromLoadedRecords({
    subscription,
    payments,
    fees,
    documents,
    contractPremium,
    contractCreatedAt,
  })
}

const FOLLOW_UP_USER_CAP = 60
const FOLLOW_UP_ROW_CAP = 40

/** Liste bornée, sans appel Mollie : échéances dues à relancer. */
export async function loadEcheancesASuivre(now = new Date()): Promise<EcheanceASuivre[]> {
  try {
    const [dueSubscriptions, unpaidFees, suspendedDocs] = await Promise.all([
      prisma.sepaSubscription.findMany({
        where: {
          status: { not: "cancelled" },
          OR: [
            { nextSepaDue: { lte: now } },
            { lastError: { not: null } },
            { firstTrimesterPaidAt: null, status: { in: ["active", "pending_mandate", "failed"] } },
          ],
        },
        select: { userId: true },
        orderBy: { nextSepaDue: { sort: "asc", nulls: "last" } },
        take: 40,
      }),
      prisma.avenantFee.findMany({
        where: { status: { not: "paid" } },
        select: { userId: true },
        orderBy: { createdAt: "asc" },
        take: 30,
      }),
      prisma.document.findMany({
        where: { status: "suspendu", type: { in: ["attestation", "attestation_nominative"] } },
        select: { userId: true },
        orderBy: { createdAt: "asc" },
        take: 30,
      }),
    ])

    const userIds: string[] = []
    const seen = new Set<string>()
    const pushUser = (userId: string) => {
      if (seen.has(userId) || userIds.length >= FOLLOW_UP_USER_CAP) return
      seen.add(userId)
      userIds.push(userId)
    }
    for (const row of dueSubscriptions) pushUser(row.userId)
    for (const row of unpaidFees) pushUser(row.userId)
    for (const row of suspendedDocs) pushUser(row.userId)
    if (userIds.length === 0) return []

    const [users, subscriptions, payments, fees, documents] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, raisonSociale: true },
      }),
      prisma.sepaSubscription.findMany({
        where: { userId: { in: userIds } },
        select: {
          id: true,
          userId: true,
          primeAnnuelle: true,
          firstTrimesterPaidAt: true,
          trimestresSepaPayes: true,
          lastError: true,
          sepaPendingPaymentId: true,
        },
      }),
      prisma.payment.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, status: true, paidAt: true, metadata: true, createdAt: true, molliePaymentId: true },
      }),
      prisma.avenantFee.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, id: true, amount: true, status: true, paidAt: true, createdAt: true },
      }),
      prisma.document.findMany({
        where: { userId: { in: userIds }, type: { in: ["contrat", "attestation", "attestation_nominative"] } },
        select: { userId: true, id: true, type: true, numero: true, status: true, data: true, createdAt: true },
      }),
    ])

    let contracts: { userId: string | null; premium: number; createdAt: Date }[] = []
    try {
      contracts = await prisma.insuranceContract.findMany({
        where: { userId: { in: userIds }, productType: "decennale" },
        select: { userId: true, premium: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      })
    } catch {
      contracts = []
    }

    const userById = new Map(users.map((user) => [user.id, user]))
    const subscriptionByUser = new Map(subscriptions.map((row) => [row.userId, row]))
    const paymentsByUser = new Map<string, EcheancePayment[]>()
    for (const payment of payments) {
      const list = paymentsByUser.get(payment.userId) ?? []
      list.push(payment)
      paymentsByUser.set(payment.userId, list)
    }
    const feesByUser = new Map<string, EcheanceFee[]>()
    for (const fee of fees) {
      const list = feesByUser.get(fee.userId) ?? []
      list.push(fee)
      feesByUser.set(fee.userId, list)
    }
    const documentsByUser = new Map<string, EcheanceDocument[]>()
    for (const document of documents) {
      const list = documentsByUser.get(document.userId) ?? []
      list.push(document)
      documentsByUser.set(document.userId, list)
    }
    const contractByUser = new Map<string, { premium: number; createdAt: Date }>()
    for (const contract of contracts) {
      if (!contract.userId || contract.premium <= 0 || contractByUser.has(contract.userId)) continue
      contractByUser.set(contract.userId, { premium: contract.premium, createdAt: contract.createdAt })
    }

    const inputs = userIds.flatMap((userId) => {
      const user = userById.get(userId)
      if (!user) return []
      const subscription = subscriptionByUser.get(userId) ?? null
      const userPayments = paymentsByUser.get(userId) ?? []
      const contract = contractByUser.get(userId)
      const rows = echeancesFromLoadedRecords({
        subscription,
        payments: userPayments,
        fees: (feesByUser.get(userId) ?? []).slice().sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()),
        documents: (documentsByUser.get(userId) ?? []).slice().sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()),
        contractPremium: contract?.premium ?? null,
        contractCreatedAt: contract?.createdAt ?? null,
      })
      const pendingId = subscription?.sepaPendingPaymentId?.trim() || ""
      return [{
        userId,
        clientLabel: user.raisonSociale?.trim() || user.email,
        rows,
        sepaPendingPaymentId: pendingId || null,
        pendingLocalPayment: pendingId ? userPayments.find((payment) => payment.molliePaymentId === pendingId) ?? null : null,
      }]
    })

    return selectEcheancesASuivre(inputs, now).slice(0, FOLLOW_UP_ROW_CAP)
  } catch (error) {
    console.error("[echeances-a-suivre]", error)
    return []
  }
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
