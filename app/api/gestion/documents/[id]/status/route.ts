import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"
import { logAdminActivity } from "@/lib/admin-activity"

/** Suspension pour impayé : **attestation décennale** uniquement (`type === "attestation"`). L’attestation DO n’est pas dans ce flux. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { status, motif } = body

    if (!["valide", "suspendu", "resilie"].includes(status)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 })
    }

    const document = await prisma.document.findFirst({
      where: {
        id,
        type: status === "resilie" ? { in: ["attestation", "contrat"] } : "attestation",
      },
      include: { user: true },
    })

    if (!document) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
    }

    await prisma.document.update({
      where: { id },
      data: { status },
    })

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: status === "resilie" ? "resiliation" : "status_change",
      targetType: "document",
      targetId: id,
      details: { status, documentType: document.type },
    })

    if (status === "suspendu") {
      const data = JSON.parse(document.data) as { raisonSociale?: string }
      const template = EMAIL_TEMPLATES.alerteImpaye(data.raisonSociale || document.user.raisonSociale || document.user.email)
      await sendEmail({
        to: document.user.email,
        subject: template.subject,
        text: template.text,
        html: (template as { html?: string }).html,
      })
    }

    if (status === "resilie") {
      await prisma.resiliationLog.create({
        data: {
          documentId: id,
          adminEmail: session.user.email || "admin",
          motif: motif || null,
        },
      })
      const data = JSON.parse(document.data) as { raisonSociale?: string }
      const typeDoc = document.type === "attestation" ? "attestation" : "contrat"
      const template = EMAIL_TEMPLATES.confirmationResiliation(
        data.raisonSociale || document.user.raisonSociale || document.user.email,
        document.numero,
        typeDoc
      )
      await sendEmail({
        to: document.user.email,
        subject: template.subject,
        text: template.text,
        html: (template as { html?: string }).html,
      })
    }

    return NextResponse.json({ ok: true, status })
  } catch (error) {
    console.error("Erreur mise à jour statut:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour" },
      { status: 500 }
    )
  }
}
