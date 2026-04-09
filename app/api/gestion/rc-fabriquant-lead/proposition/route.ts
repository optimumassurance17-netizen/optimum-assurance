import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"
import { logAdminActivity } from "@/lib/admin-activity"
import { normalizeRcFabriquantLeadStatut } from "@/lib/rc-fabriquant-lead-statuts"
import { sendRcFabriquantEmailCopy } from "@/lib/rc-fabriquant-email-copy"

const MESSAGE_MIN = 20
const MESSAGE_MAX = 12000

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

    const o = body as Record<string, unknown>
    const leadId = typeof o.leadId === "string" ? o.leadId.trim() : ""
    const messagePersonnalise =
      typeof o.messagePersonnalise === "string" ? o.messagePersonnalise.trim() : ""
    const primeRaw = o.primeAnnuelle

    if (!leadId) {
      return NextResponse.json({ error: "leadId requis" }, { status: 400 })
    }
    if (messagePersonnalise.length < MESSAGE_MIN) {
      return NextResponse.json(
        { error: `Message trop court (minimum ${MESSAGE_MIN} caractères)` },
        { status: 400 }
      )
    }
    if (messagePersonnalise.length > MESSAGE_MAX) {
      return NextResponse.json({ error: "Message trop long" }, { status: 400 })
    }

    let primeAnnuelle: number | undefined
    if (primeRaw !== undefined && primeRaw !== null && primeRaw !== "") {
      const n = typeof primeRaw === "number" ? primeRaw : Number(primeRaw)
      if (!Number.isFinite(n) || n <= 0 || n > 50_000_000) {
        return NextResponse.json({ error: "Prime annuelle invalide" }, { status: 400 })
      }
      primeAnnuelle = Math.round(n * 100) / 100
    }

    const lead = await prisma.devisRcFabriquantLead.findUnique({ where: { id: leadId } })
    if (!lead) {
      return NextResponse.json({ error: "Lead introuvable" }, { status: 404 })
    }

    if (normalizeRcFabriquantLeadStatut(lead.statut) === "refuse") {
      return NextResponse.json(
        { error: "Lead au statut « Refusé » : pas d’envoi de proposition." },
        { status: 400 }
      )
    }

    let raisonSociale = ""
    try {
      const j = JSON.parse(lead.data || "{}") as { raisonSociale?: string }
      raisonSociale = (j.raisonSociale ?? "").trim() || lead.email
    } catch {
      raisonSociale = lead.email
    }

    const template = EMAIL_TEMPLATES.propositionRcFabriquant(raisonSociale, messagePersonnalise, primeAnnuelle)
    const replyTo = session.user.email?.trim()

    const sent = await sendEmail({
      to: lead.email,
      subject: template.subject,
      text: template.text,
      html: template.html,
      ...(replyTo ? { replyTo } : {}),
    })

    if (!sent) {
      return NextResponse.json(
        { error: "Envoi impossible (RESEND_API_KEY / domaine expéditeur)" },
        { status: 503 }
      )
    }
    const copySent = await sendRcFabriquantEmailCopy({
      originalTo: lead.email,
      subject: template.subject,
      text: template.text,
      html: template.html,
      contextLabel: "proposition_rc_fabriquant_depuis_gestion",
    })

    await prisma.devisRcFabriquantLead.update({
      where: { id: leadId },
      data: {
        statut: "proposition_envoyee",
        primeProposee: primeAnnuelle ?? null,
        propositionEnvoyeeAt: new Date(),
      },
    })

    await logAdminActivity({
      adminEmail: session.user.email ?? "unknown",
      action: "rc_fabriquant_proposition_email",
      targetType: "DevisRcFabriquantLead",
      targetId: leadId,
      details: {
        to: lead.email,
        copySent,
        ...(primeAnnuelle != null ? { primeAnnuelle } : {}),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[gestion/rc-fabriquant-lead/proposition]", e)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
