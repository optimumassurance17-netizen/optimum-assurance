import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const attestations = await prisma.document.findMany({
      where: {
        userId: session.user.id,
        type: "attestation",
        status: "suspendu",
      },
      orderBy: { createdAt: "desc" },
    })

    const result = attestations.map((a) => {
      const data = JSON.parse(a.data) as Record<string, unknown>
      const primeAnnuelle = (data.primeAnnuelle as number) ?? 0
      const primeTrimestrielle = data.primeTrimestrielle as number | undefined
      const montantDu = primeTrimestrielle ?? Math.round((primeAnnuelle / 4) * 100) / 100

      return {
        id: a.id,
        numero: a.numero,
        raisonSociale: data.raisonSociale,
        montantDu,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Erreur attestations suspendues:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    )
  }
}
