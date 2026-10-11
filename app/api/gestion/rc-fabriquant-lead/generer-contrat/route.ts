import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import JSZip from "jszip"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { logAdminActivity } from "@/lib/admin-activity"
import {
  generateRcFabBatteriesFicPdf,
  generateRcFabBatteriesPolicyPdf,
  generateRcFabBatteriesQuotePdf,
} from "@/lib/pdf/rc-fabriquant/generateDossier"
import { normalizeRcFabPeriodicity } from "@/lib/rc-fabriquant-dossier-config"
import {
  RC_FAB_ADRESSE_NON_DECLAREE,
  buildRcFabContratConfig,
  parseRcFabDemande,
} from "@/lib/rc-fabriquant-contrat-demande"

export const runtime = "nodejs"

function parseAmount(input: unknown): number {
  if (typeof input === "number") return input
  if (typeof input === "string") return Number(input.replace(",", ".").trim())
  return Number.NaN
}

function toFrDate(input: Date): string {
  return input.toLocaleDateString("fr-FR")
}

/**
 * Produit le devis, la FIC et le contrat à partir de la demande client.
 * Aucun email, aucune signature et aucun paiement.
 */
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
      return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Corps invalide" }, { status: 400 })
    }

    const payload = body as Record<string, unknown>
    const leadId = typeof payload.leadId === "string" ? payload.leadId.trim() : ""
    if (!leadId) {
      return NextResponse.json({ error: "Choisissez une demande client." }, { status: 400 })
    }

    const primeAnnuelleTtc = parseAmount(payload.primeAnnuelleTtc)
    if (!Number.isFinite(primeAnnuelleTtc) || primeAnnuelleTtc <= 0) {
      return NextResponse.json({ error: "Prime annuelle TTC invalide (> 0)" }, { status: 400 })
    }
    const primeAnnuelleHtParsed = parseAmount(payload.primeAnnuelleHt)
    const primeHtProvided = payload.primeAnnuelleHt != null && payload.primeAnnuelleHt !== ""
    const primeAnnuelleHt =
      Number.isFinite(primeAnnuelleHtParsed) && primeAnnuelleHtParsed > 0 ? primeAnnuelleHtParsed : undefined
    if (primeHtProvided && primeAnnuelleHt == null) {
      return NextResponse.json({ error: "Prime annuelle HT invalide" }, { status: 400 })
    }

    const lead = await prisma.devisRcFabriquantLead.findUnique({
      where: { id: leadId },
      select: { id: true, email: true, data: true },
    })
    if (!lead) {
      return NextResponse.json({ error: "Demande RC Fabriquant introuvable" }, { status: 404 })
    }

    const demande = parseRcFabDemande(lead.data, lead.email)
    const referenceInput =
      typeof payload.devisReference === "string" ? payload.devisReference.trim().slice(0, 120) : ""
    const referenceContrat = referenceInput || `RCFAB-${lead.id.slice(-8).toUpperCase()}`
    const periodicite = normalizeRcFabPeriodicity(
      typeof payload.periodicite === "string" ? payload.periodicite.trim().toLowerCase() : null
    )
    const config = buildRcFabContratConfig({
      demande,
      referenceContrat,
      periodicite,
      primeAnnuelleTtc,
      primeAnnuelleHt,
    })

    const account = await prisma.user.findFirst({
      where: { email: { equals: lead.email.trim(), mode: "insensitive" } },
      select: { adresse: true, codePostal: true, ville: true },
    })
    const adresse =
      [account?.adresse, account?.codePostal, account?.ville].filter(Boolean).join(" ").trim() ||
      RC_FAB_ADRESSE_NON_DECLAREE

    const now = new Date()
    const expiry = new Date(now)
    expiry.setFullYear(expiry.getFullYear() + 1)
    const documentData = {
      nomSociete: demande.raisonSociale || lead.email,
      siret: demande.siret || undefined,
      adresse,
      activite: config.activite,
      dateEffet: toFrDate(now),
      dateEcheance: toFrDate(expiry),
      referenceContrat: config.referenceContrat,
      config,
      demandeLines: config.demandeLignes,
    }

    const [quote, fic, policy] = await Promise.all([
      generateRcFabBatteriesQuotePdf(documentData),
      generateRcFabBatteriesFicPdf(documentData),
      generateRcFabBatteriesPolicyPdf(documentData),
    ])

    const zip = new JSZip()
    zip.file("devis-rc-fabricant.pdf", quote)
    zip.file("fic-rc-fabricant.pdf", fic)
    zip.file("contrat-rc-fabricant.pdf", policy)
    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    })

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: "rc_fabriquant_contrat_genere",
      targetType: "DevisRcFabriquantLead",
      targetId: lead.id,
      details: {
        email: lead.email,
        activite: config.activite,
        typeProduit: demande.typeProduit || null,
        reference: config.referenceContrat,
        primeAnnuelleTtc: config.primeAnnuelleTtc,
        periodicite: config.periodicite,
      },
    })

    const safeName = config.referenceContrat.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 80) || "rc-fabricant"
    return new NextResponse(Buffer.from(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="contrat-rc-fabricant-${safeName}.zip"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    console.error("[gestion/rc-fabriquant-lead/generer-contrat]", error)
    return NextResponse.json({ error: "Le contrat n'a pas pu être généré." }, { status: 500 })
  }
}
