import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type PendingContractData = {
  customUploadedDevisFlow?: unknown
  produitLabel?: unknown
  afterSignNextPath?: unknown
}

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

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const rows = await prisma.pendingSignature.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        signatureRequestId: true,
        contractNumero: true,
        contractData: true,
        createdAt: true,
      },
    })

    const items = rows.map((row) => {
      let parsed: PendingContractData = {}
      try {
        parsed = JSON.parse(row.contractData || "{}") as PendingContractData
      } catch {
        parsed = {}
      }

      const customUploadedDevisFlow = parsed.customUploadedDevisFlow === true
      const produitLabel = asTrimmedString(parsed.produitLabel)
      const fallbackNextPath = customUploadedDevisFlow ? "/espace-client" : "/signature/callback?success=1"
      const nextPath = normalizeInternalPath(asTrimmedString(parsed.afterSignNextPath), fallbackNextPath)
      const signatureLink = `/sign/${row.signatureRequestId}?next=${encodeURIComponent(nextPath)}`

      return {
        signatureRequestId: row.signatureRequestId,
        contractNumero: row.contractNumero,
        createdAt: row.createdAt.toISOString(),
        signatureFlow: customUploadedDevisFlow ? "custom_pdf" : "decennale",
        signatureFlowLabel:
          produitLabel || (customUploadedDevisFlow ? "Document personnalisé" : "Contrat décennale"),
        signatureLink,
      }
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error("Erreur liste signatures en attente client:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des signatures en attente" },
      { status: 500 }
    )
  }
}
