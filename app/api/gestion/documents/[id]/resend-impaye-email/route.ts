import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"
import { logAdminActivity } from "@/lib/admin-activity"

function parseDocumentData(value: string): { raisonSociale?: string } {
  try {
    return JSON.parse(value || "{}") as { raisonSociale?: string }
  } catch {
    return {}
  }
}

/** Renvoie l’email de relance impayé (décennale uniquement). */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { id } = await params

    const document = await prisma.document.findFirst({
      where: {
        id,
        type: "attestation",
        status: "suspendu",
      },
      include: { user: true },
    })

    if (!document) {
      return NextResponse.json(
        { error: "Attestation décennale suspendue introuvable (le DO n’est pas concerné par l’impayé)." },
        { status: 404 }
      )
    }

    const data = parseDocumentData(document.data)
    const template = EMAIL_TEMPLATES.alerteImpaye(
      data.raisonSociale || document.user.raisonSociale || document.user.email
    )
    await sendEmail({
      to: document.user.email,
      subject: template.subject,
      text: template.text,
      html: (template as { html?: string }).html,
    })

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: "impaye_relance_email",
      targetType: "document",
      targetId: id,
      details: { documentType: document.type, numero: document.numero },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("resend-impaye-email:", error)
    return NextResponse.json({ error: "Erreur lors de l’envoi" }, { status: 500 })
  }
}
