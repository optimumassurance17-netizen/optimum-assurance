import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { hash } from "bcryptjs"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { logAdminActivity } from "@/lib/admin-activity"
import { SITE_URL } from "@/lib/site-url"
import { sendAccountCreationSummaryAlert } from "@/lib/account-creation-alert"

function generateTempPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"
  let pwd = ""
  for (let i = 0; i < 12; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)]
  }
  return pwd
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
    const payload = body as { leadId?: unknown; leadType?: unknown }
    const leadId = typeof payload.leadId === "string" ? payload.leadId.trim() : ""
    const leadTypeRaw = typeof payload.leadType === "string" ? payload.leadType.trim().toLowerCase() : ""
    const isRcFabLeadType =
      leadTypeRaw === "rc_fabriquant" ||
      leadTypeRaw === "rc-fabriquant" ||
      leadTypeRaw === "rc fabricant" ||
      leadTypeRaw === "rc_fabricant"
    const leadType = isRcFabLeadType ? "rc_fabriquant" : "dommage_ouvrage"

    if (!leadId) {
      return NextResponse.json({ error: "leadId requis" }, { status: 400 })
    }

    const lead =
      leadType === "rc_fabriquant"
        ? await prisma.devisRcFabriquantLead.findUnique({
            where: { id: leadId },
            select: { id: true, email: true, data: true },
          })
        : await prisma.devisDommageOuvrageLead.findUnique({
            where: { id: leadId },
            select: { id: true, email: true, data: true },
          })

    if (!lead) {
      return NextResponse.json({ error: "Lead introuvable" }, { status: 404 })
    }

    const existing = await prisma.user.findUnique({
      where: { email: lead.email.toLowerCase() },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cet email", userId: existing.id },
        { status: 400 }
      )
    }

    const tempPassword = generateTempPassword()
    const passwordHash = await hash(tempPassword, 12)

    let raisonSociale: string | null = null
    let siret: string | null = null
    let telephone: string | null = null
    try {
      const leadData = JSON.parse(lead.data) as {
        raisonSociale?: string
        siret?: string
        telephone?: string
      }
      raisonSociale = leadData.raisonSociale || null
      siret = leadData.siret ? String(leadData.siret).replace(/\s/g, "").trim() : null
      telephone = leadData.telephone ? String(leadData.telephone).trim() : null
    } catch {
      /* ignore */
    }

    const user = await prisma.user.create({
      data: {
        email: lead.email.toLowerCase(),
        passwordHash,
        raisonSociale: raisonSociale || lead.email,
        ...(siret ? { siret } : {}),
        ...(telephone ? { telephone } : {}),
      },
    })

    const template = {
      subject: "Votre compte Optimum Assurance a été créé",
      text: `Bonjour,\n\nVotre compte a été créé pour accéder à votre espace client.\n\nEmail : ${user.email}\nMot de passe temporaire : ${tempPassword}\n\nConnectez-vous et changez votre mot de passe dès que possible : ${SITE_URL}/connexion\n\nCordialement,\nOptimum Assurance`,
      html: `<p>Bonjour,</p><p>Votre compte a été créé pour accéder à votre espace client.</p><p><strong>Email :</strong> ${user.email}<br><strong>Mot de passe temporaire :</strong> ${tempPassword}</p><p><a href="${SITE_URL}/connexion" style="color:#2563eb;font-weight:bold">Se connecter à mon espace client</a></p><p>Pensez à changer votre mot de passe dès la première connexion.</p><p>Cordialement,<br>Optimum Assurance</p>`,
    }

    const sent = await sendEmail({
      to: user.email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    })
    if (!sent) {
      return NextResponse.json(
        { error: "Envoi de l'email client impossible (RESEND_API_KEY / domaine expéditeur)" },
        { status: 503 }
      )
    }

    const accountCreationAlertSent = await sendAccountCreationSummaryAlert({
      source: "admin_create_from_lead",
      createdBy: session.user.email || "admin",
      leadType,
      leadId,
      user: {
        id: user.id,
        email: user.email,
        raisonSociale: user.raisonSociale,
        siret: siret ?? undefined,
        telephone: telephone ?? undefined,
      },
    })

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: "user_create_from_lead",
      targetType: "user",
      targetId: user.id,
      details: {
        email: user.email,
        leadId,
        leadType,
        accountCreationAlertSent,
      },
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      raisonSociale: user.raisonSociale,
    })
  } catch (error) {
    console.error("Erreur création compte depuis lead:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création du compte" },
      { status: 500 }
    )
  }
}
