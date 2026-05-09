import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { createInsuranceContract } from "@/lib/insurance-contract-service"
import { logAdminActivity } from "@/lib/admin-activity"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function asPositiveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", ".").trim())
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return null
}

function asOptionalNonNegativeNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", ".").trim())
    if (Number.isFinite(parsed) && parsed >= 0) return parsed
  }
  return undefined
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 })
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Objet JSON attendu" }, { status: 400 })
    }

    const raw = body as Record<string, unknown>
    const userId = asTrimmedString(raw.userId)
    const premium = asPositiveNumber(raw.primeAnnuelle)
    const coutConstruction = asOptionalNonNegativeNumber(raw.coutConstruction)
    const projectAddress = asTrimmedString(raw.adresseOperation)
    const constructionNature = asTrimmedString(raw.typeConstruction)
    const destination = asTrimmedString(raw.destination)
    const closCouvertRaw = raw.closCouvert
    const closCouvert =
      closCouvertRaw === true || closCouvertRaw === "oui"
        ? true
        : closCouvertRaw === false || closCouvertRaw === "non"
          ? false
          : undefined

    if (!userId) return NextResponse.json({ error: "Client requis" }, { status: 400 })
    if (premium == null) return NextResponse.json({ error: "Prime annuelle invalide" }, { status: 400 })
    if (!projectAddress) {
      return NextResponse.json({ error: "Adresse de l'opération requise" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        raisonSociale: true,
        siret: true,
        adresse: true,
        codePostal: true,
        ville: true,
      },
    })
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 })

    const clientName = user.raisonSociale?.trim() || user.email
    const clientAddress =
      [user.adresse, user.codePostal, user.ville].filter(Boolean).join(" ").trim() || projectAddress
    const projectName = constructionNature || "Projet dommage ouvrage"
    const activities = [
      constructionNature,
      destination ? `Destination : ${destination}` : undefined,
      closCouvert != null ? (closCouvert ? "Garantie clos et couvert" : "Dommage ouvrage complète") : undefined,
      coutConstruction != null ? `Coût construction : ${coutConstruction.toLocaleString("fr-FR")} €` : undefined,
    ].filter((value): value is string => Boolean(value?.trim()))

    const { contract, risk } = await createInsuranceContract({
      productType: "do",
      clientName,
      siret: user.siret ?? undefined,
      address: clientAddress,
      activities,
      projectName,
      projectAddress,
      constructionNature,
      premium,
      userId,
      missingDocuments: false,
      companyAgeMonths: null,
    })

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: "do_contract_create_from_gestion",
      targetType: "insurance_contract",
      targetId: contract.id,
      details: {
        userId,
        contractNumber: contract.contractNumber,
        status: contract.status,
        premium,
        coutConstruction,
        projectAddress,
        riskScore: risk.score,
        riskReasons: risk.reasons,
      },
    })

    let emailSent: boolean | null = null
    if (user.email) {
      const template = EMAIL_TEMPLATES.devisDoAjoute(clientName, contract.contractNumber, premium)
      emailSent = await sendEmail({
        to: user.email,
        subject: template.subject,
        text: template.text,
        html: (template as { html?: string }).html,
      })
    }

    return NextResponse.json({
      contract: {
        id: contract.id,
        contractNumber: contract.contractNumber,
        status: contract.status,
        riskScore: risk.score,
        riskReasons: risk.reasons,
      },
      emailSent,
    })
  } catch (error) {
    console.error("Erreur création contrat DO gestion:", error)
    return NextResponse.json({ error: "Erreur lors de la création du contrat DO" }, { status: 500 })
  }
}
