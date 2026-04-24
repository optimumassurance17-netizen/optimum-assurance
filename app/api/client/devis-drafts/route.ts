import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type DraftDataPayload = {
  raisonSociale?: unknown
  siret?: unknown
  tarif?: {
    primeAnnuelle?: unknown
  }
}

function asOptionalText(value: unknown): string | null {
  if (typeof value !== "string") return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const sessionEmail = asOptionalText(session.user.email)?.toLowerCase()
    const email =
      sessionEmail ||
      (
        await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { email: true },
        })
      )?.email
        ?.trim()
        .toLowerCase() ||
      ""

    if (!email) {
      return NextResponse.json([])
    }

    const drafts = await prisma.devisDraft.findMany({
      where: {
        email,
        produit: "decennale",
        expiresAt: { gte: new Date() },
      },
      select: {
        id: true,
        token: true,
        produit: true,
        createdAt: true,
        expiresAt: true,
        data: true,
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    })

    const response = drafts.map((draft) => {
      let raisonSociale: string | null = null
      let siret: string | null = null
      let primeAnnuelle: number | null = null
      try {
        const parsed = JSON.parse(draft.data || "{}") as DraftDataPayload
        raisonSociale = asOptionalText(parsed.raisonSociale)
        siret = asOptionalText(parsed.siret)
        const prime =
          typeof parsed.tarif?.primeAnnuelle === "number"
            ? parsed.tarif.primeAnnuelle
            : Number(parsed.tarif?.primeAnnuelle)
        if (Number.isFinite(prime) && prime > 0) {
          primeAnnuelle = Math.round(prime)
        }
      } catch {
        /* ignore parse errors */
      }

      return {
        id: draft.id,
        token: draft.token,
        produit: draft.produit,
        createdAt: draft.createdAt.toISOString(),
        expiresAt: draft.expiresAt.toISOString(),
        raisonSociale,
        siret,
        primeAnnuelle,
      }
    })

    return NextResponse.json({ drafts: response })
  } catch (error) {
    console.error("Erreur liste devis drafts client:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des devis sauvegardés" },
      { status: 500 }
    )
  }
}
