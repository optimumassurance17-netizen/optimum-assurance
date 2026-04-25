import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { fetchUserDocumentReviews } from "@/lib/user-document-review"

function isSchemaDriftError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (((error as { code?: string }).code === "P2021") || ((error as { code?: string }).code === "P2022"))
  )
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const docs = await prisma.userDocument.findMany({
      where: { userId: session.user.id },
      orderBy: { type: "asc" },
    })

    const reviews = await fetchUserDocumentReviews(docs.map((d) => d.id))
    return NextResponse.json(
      docs.map((d) => ({
        id: d.id,
        type: d.type,
        filename: d.filename,
        size: d.size,
        createdAt: d.createdAt,
        review: reviews[d.id] ?? null,
      }))
    )
  } catch (error) {
    if (isSchemaDriftError(error)) {
      console.error("GED list indisponible (schéma non aligné):", error)
      return NextResponse.json(
        { error: "GED temporairement indisponible: migration base requise" },
        { status: 503 }
      )
    }
    console.error("Erreur liste documents uploadés:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    )
  }
}
