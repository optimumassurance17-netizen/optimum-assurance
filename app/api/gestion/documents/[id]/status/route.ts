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
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 })
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Objet JSON attendu" }, { status: 400 })
    }
    const payload = body as Record<string, unknown>
    const status = typeof payload.status === "string" ? payload.status.trim() : ""
    const motif = typeof payload.motif === "string" ? payload.motif.trim() : undefined

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
      const data = parseDocumentData(document.data)
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
      const data = parseDocumentData(document.data)
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
