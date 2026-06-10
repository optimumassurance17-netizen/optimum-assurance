import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { Prisma } from "@/lib/prisma-client"
import { prisma } from "@/lib/prisma"

const CLIENT_SEARCH_LIMIT = 8

type SearchableClient = {
  id: string
  email: string
  raisonSociale: string | null
  siret: string | null
  createdAt: Date
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function normalizeSiret(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "")
}

function getMatchScore(client: SearchableClient, query: string, siretQuery: string): number {
  const candidates = [normalizeText(client.email), normalizeText(client.raisonSociale)]
  const siret = normalizeSiret(client.siret)
  let score = Number.POSITIVE_INFINITY

  for (const candidate of candidates) {
    if (!candidate) continue
    if (candidate === query) score = Math.min(score, 0)
    else if (candidate.startsWith(query)) score = Math.min(score, 1)
    else if (candidate.includes(query)) score = Math.min(score, 2)
  }

  if (siretQuery) {
    if (siret === siretQuery) score = Math.min(score, 0)
    else if (siret.startsWith(siretQuery)) score = Math.min(score, 1)
    else if (siret.includes(siretQuery)) score = Math.min(score, 2)
  }

  return Number.isFinite(score) ? score : 99
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const rawQuery = request.nextUrl.searchParams.get("q")?.trim() ?? ""
    const normalizedQuery = normalizeText(rawQuery)
    const normalizedSiret = normalizeSiret(rawQuery)

    if (normalizedQuery.length < 2 && normalizedSiret.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const orFilters: Prisma.UserWhereInput[] = []
    if (normalizedQuery.length >= 2) {
      orFilters.push(
        { email: { contains: rawQuery, mode: "insensitive" } },
        { raisonSociale: { contains: rawQuery, mode: "insensitive" } }
      )
    }
    if (normalizedSiret.length >= 2) {
      orFilters.push({ siret: { contains: normalizedSiret } })
    }

    const clients = await prisma.user.findMany({
      where: {
        OR: orFilters,
      },
      select: {
        id: true,
        email: true,
        raisonSociale: true,
        siret: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    const results = clients
      .sort((a, b) => {
        const scoreDiff =
          getMatchScore(a, normalizedQuery, normalizedSiret) -
          getMatchScore(b, normalizedQuery, normalizedSiret)
        if (scoreDiff !== 0) return scoreDiff
        return b.createdAt.getTime() - a.createdAt.getTime()
      })
      .slice(0, CLIENT_SEARCH_LIMIT)
      .map(({ createdAt: _createdAt, ...client }) => client)

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Client search error:", error)
    return NextResponse.json({ error: "Erreur recherche fiche client" }, { status: 500 })
  }
}
