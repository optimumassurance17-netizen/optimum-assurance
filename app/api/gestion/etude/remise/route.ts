import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://optimum-assurance.fr"
const DRAFT_EXPIRY_DAYS = 7

/**
 * Envoie une remise personnalisée au client (prime après étude)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const body = await request.json()
    const { etudeLeadId, primeAnnuelle } = body

    if (!etudeLeadId || typeof primeAnnuelle !== "number" || primeAnnuelle <= 0) {
      return NextResponse.json(
        { error: "ID étude et prime annuelle requis" },
        { status: 400 }
      )
    }

    const lead = await prisma.devisEtudeLead.findUnique({
      where: { id: etudeLeadId },
    })

    if (!lead || lead.statut !== "pending") {
      return NextResponse.json(
        { error: "Demande d'étude introuvable ou déjà traitée" },
        { status: 404 }
      )
    }

    let dataEtude: Record<string, unknown> = {}
    try {
      dataEtude = JSON.parse(lead.data) as Record<string, unknown>
    } catch {
      /* ignore */
    }

    const chiffreAffaires = Number(dataEtude.chiffreAffaires) || 40000
    const primeMensuelle = Math.round((primeAnnuelle / 12) * 100) / 100
    const primeTrimestrielle = Math.round((primeAnnuelle / 4) * 100) / 100
    const franchise = Math.max(2500, Math.round(chiffreAffaires * 0.05))
    const plafond = chiffreAffaires * 2

    const tarif = {
      primeAnnuelle,
      primeMensuelle,
      primeTrimestrielle,
      franchise,
      plafond,
      reprisePasse: false,
      supplementReprisePasse: undefined,
      details: {
        base: primeAnnuelle,
        majorationSinistres: 0,
        majorationNouveau: 0,
        majorationActivites: 0,
      },
    }

    const devis = {
      siret: lead.siret || dataEtude.siret,
      raisonSociale: lead.raisonSociale || (dataEtude as { raisonSociale?: string }).raisonSociale,
      chiffreAffaires,
      sinistres: Number(dataEtude.sinistres) ?? 0,
      jamaisAssure: Boolean(dataEtude.jamaisAssure),
      resilieNonPaiement: Boolean((dataEtude as { resilieNonPaiement?: boolean }).resilieNonPaiement),
      activites: Array.isArray(dataEtude.activites) ? dataEtude.activites : [],
      tarif,
      reprisePasse: false,
      montantIndemnisations: Number(dataEtude.montantIndemnisations) || 0,
      releveSinistraliteNom: (dataEtude as { releveSinistraliteNom?: string }).releveSinistraliteNom,
    }

    const token = crypto.randomBytes(24).toString("hex")
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + DRAFT_EXPIRY_DAYS)
    const resumeUrl = `${APP_URL}/devis/resume/${token}`

    await prisma.devisDraft.create({
      data: {
        token,
        email: lead.email,
        data: JSON.stringify(devis),
        produit: "decennale",
        expiresAt,
      },
    })

    const template = EMAIL_TEMPLATES.remisePersonnaliseeEtude(
      lead.raisonSociale || lead.email,
      primeAnnuelle,
      resumeUrl
    )
    const sent = await sendEmail({
      to: lead.email,
      subject: template.subject,
      text: template.text,
      html: (template as { html?: string }).html,
    })

    if (!sent) {
      return NextResponse.json(
        { error: "Envoi d'email non configuré (RESEND_API_KEY)" },
        { status: 503 }
      )
    }

    await prisma.devisEtudeLead.update({
      where: { id: etudeLeadId },
      data: {
        statut: "mise_envoyee",
        primeProposee: primeAnnuelle,
        miseEnvoyeeAt: new Date(),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Erreur remise étude:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'envoi" },
      { status: 500 }
    )
  }
}
