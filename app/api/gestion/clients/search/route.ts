import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { Prisma } from "@/lib/prisma-client"
import { prisma } from "@/lib/prisma"
import {
  doDevisLeadRowId,
  doLeadMatchesSearch,
  readDoLeadChantier,
  readDoLeadCompanyName,
  sortRequestsByArrival,
} from "@/lib/devis-do-lead"
import { CONTRACT_STATUS } from "@/lib/insurance-contract-status"

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
      .map((client) => ({
        id: client.id,
        email: client.email,
        raisonSociale: client.raisonSociale,
        siret: client.siret,
      }))

    const devisDoLeads = await findDoDevisLeadMatches(rawQuery)
    const contracts = await findInsuranceContractMatches(rawQuery)

    return NextResponse.json({ results, devisDoLeads, contracts })
  } catch (error) {
    console.error("Client search error:", error)
    return NextResponse.json({ error: "Erreur recherche fiche client" }, { status: 500 })
  }
}

async function findInsuranceContractMatches(rawQuery: string) {
  try {
    const contracts = await prisma.insuranceContract.findMany({
      where: {
        OR: [
          { clientName: { contains: rawQuery, mode: "insensitive" } },
          { contractNumber: { contains: rawQuery, mode: "insensitive" } },
          { projectName: { contains: rawQuery, mode: "insensitive" } },
          { projectAddress: { contains: rawQuery, mode: "insensitive" } },
          { user: { raisonSociale: { contains: rawQuery, mode: "insensitive" } } },
          { user: { email: { contains: rawQuery, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        contractNumber: true,
        productType: true,
        clientName: true,
        status: true,
        premium: true,
        paidAt: true,
        userId: true,
        storedDocuments: {
          where: { type: "certificate" },
          take: 1,
          select: { id: true },
        },
      },
      orderBy: [
        { productType: "asc" },
        { createdAt: "desc" },
      ],
      take: 12,
    })
    return contracts
      .sort((a, b) => {
        const aDo = a.productType === "do" ? 0 : 1
        const bDo = b.productType === "do" ? 0 : 1
        if (aDo !== bDo) return aDo - bDo
        const aPayable = a.status === CONTRACT_STATUS.approved && !a.paidAt ? 0 : 1
        const bPayable = b.status === CONTRACT_STATUS.approved && !b.paidAt ? 0 : 1
        return aPayable - bPayable
      })
      .slice(0, 8)
      .map(({ storedDocuments, paidAt, ...contract }) => ({
        ...contract,
        paidAt: paidAt ? paidAt.toISOString() : null,
        hasCertificate: storedDocuments.length > 0,
      }))
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return []
    }
    throw error
  }
}

async function findDoDevisLeadMatches(rawQuery: string) {
  try {
    const leads = await prisma.devisDommageOuvrageLead.findMany({
      select: { id: true, email: true, data: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    })
    return sortRequestsByArrival(
      leads
        .map((lead) => ({
          id: lead.id,
          email: lead.email,
          raisonSociale: readDoLeadCompanyName(lead.data),
          chantier: readDoLeadChantier(lead.data),
          createdAt: lead.createdAt,
        }))
        .filter((lead) => doLeadMatchesSearch(lead, rawQuery))
        .slice(0, 5)
    ).map((lead) => ({
        id: lead.id,
        email: lead.email,
        raisonSociale: lead.raisonSociale,
        href: `/gestion#${doDevisLeadRowId(lead.id)}`,
      }))
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return []
    }
    throw error
  }
}
