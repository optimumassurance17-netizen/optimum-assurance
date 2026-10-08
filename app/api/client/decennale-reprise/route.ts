import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { decideDecennaleReprise } from "@/lib/decennale-reprise"
import { isDecennaleContractData, isDecennalePendingSignatureData, parseJsonObject } from "@/lib/decennale-contract-data"
import {
  hasCurrentDecennaleFirstPayment,
  isSepaSubscriptionForCurrentDecennale,
} from "@/lib/decennale-payment-progress"
import { prisma } from "@/lib/prisma"

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeInternalPath(path: string | null | undefined, fallback: string): string {
  const trimmed = path?.trim() || ""
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback
  return trimmed.slice(0, 512)
}

function signatureHref(row: { signatureRequestId: string; contractData: string }): string {
  const parsed = parseJsonObject(row.contractData)
  const custom = parsed.customUploadedDevisFlow === true
  const fallback = custom ? "/espace-client" : "/mandat-sepa"
  const nextPath = normalizeInternalPath(asTrimmedString(parsed.afterSignNextPath), fallback)
  return `/sign/${row.signatureRequestId}?next=${encodeURIComponent(nextPath)}`
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const userId = session.user.id
    const email = session.user.email?.trim().toLowerCase() || ""
    const [pendingRows, contrats, payments, sepa, user, doContract, drafts] = await Promise.all([
      prisma.pendingSignature.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { signatureRequestId: true, contractData: true },
      }),
      prisma.document.findMany({
        where: { userId, type: "contrat" },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { numero: true, data: true, createdAt: true },
      }),
      prisma.payment.findMany({
        where: { userId, status: "paid" },
        select: { metadata: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.sepaSubscription.findUnique({
        where: { userId },
        select: { status: true, createdAt: true, firstTrimesterPaidAt: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, doInitialQuestionnaireJson: true },
      }),
      prisma.insuranceContract.findFirst({
        where: { userId, productType: "do" },
        select: { id: true },
      }),
      email
        ? prisma.devisDraft.findFirst({
            where: { email, produit: "decennale", expiresAt: { gte: new Date() } },
            orderBy: { createdAt: "desc" },
            select: { token: true },
          })
        : Promise.resolve(null),
    ])

    const decennalePending = pendingRows.find((row) => isDecennalePendingSignatureData(row.contractData))
    const pending = decennalePending ?? pendingRows[0] ?? null
    const contrat = contrats.find((row) => isDecennaleContractData(row.data)) ?? null
    const contratData = contrat ? parseJsonObject(contrat.data) : {}
    const contractDataUsable = Boolean(contrat) && !(Object.keys(contratData).length === 0 && contrat?.data?.trim())
    const firstPaymentDone = contrat
      ? hasCurrentDecennaleFirstPayment(payments, { numero: contrat.numero, createdAt: contrat.createdAt }) ||
        isSepaSubscriptionForCurrentDecennale(sepa, { numero: contrat.numero, createdAt: contrat.createdAt })
      : false

    const decision = decideDecennaleReprise({
      pendingSignatureHref: pending ? signatureHref(pending) : null,
      hasContract: Boolean(contrat),
      contractDataUsable,
      firstPaymentDone,
      draftResumeHref: drafts?.token ? `/devis/resume/${drafts.token}` : null,
      hasDoJourney: Boolean(user?.doInitialQuestionnaireJson?.trim() || doContract),
    })

    return NextResponse.json(decision)
  } catch (error) {
    console.error("[client/decennale-reprise]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
