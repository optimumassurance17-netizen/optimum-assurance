import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"
import { logAdminActivity } from "@/lib/admin-activity"

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
    const { action } = body // "approve" | "reject"

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "action invalide" }, { status: 400 })
    }

    const resiliationRequest = await prisma.resiliationRequest.findFirst({
      where: { id, status: "pending" },
      include: {
        document: { include: { user: true } },
      },
    })

    if (!resiliationRequest) {
      return NextResponse.json({ error: "Demande introuvable" }, { status: 404 })
    }

    await prisma.resiliationRequest.update({
      where: { id },
      data: {
        status: action === "approve" ? "approved" : "rejected",
        approvedAt: new Date(),
        approvedBy: session.user.email || "admin",
      },
    })

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: `resiliation_${action}`,
      targetType: "resiliation_request",
      targetId: id,
      details: {
        documentNumero: resiliationRequest.document.numero,
        documentId: resiliationRequest.documentId,
      },
    })

    if (action === "approve") {
      await prisma.document.update({
        where: { id: resiliationRequest.documentId },
        data: { status: "resilie" },
      })

      await prisma.resiliationLog.create({
        data: {
          documentId: resiliationRequest.documentId,
          adminEmail: session.user.email || "admin",
          motif: resiliationRequest.motif || "Demande client",
        },
      })

      const data = JSON.parse(resiliationRequest.document.data || "{}") as { raisonSociale?: string }
      const typeDoc = resiliationRequest.document.type === "attestation" ? "attestation" : "contrat"
      const template = EMAIL_TEMPLATES.confirmationResiliation(
        data.raisonSociale || resiliationRequest.document.user.raisonSociale || resiliationRequest.document.user.email,
        resiliationRequest.document.numero,
        typeDoc
      )
      await sendEmail({
        to: resiliationRequest.document.user.email,
        subject: template.subject,
        text: template.text,
        html: (template as { html?: string }).html,
      })
    }

    return NextResponse.json({ ok: true, status: action === "approve" ? "approved" : "rejected" })
  } catch (error) {
    console.error("Erreur traitement demande résiliation:", error)
    return NextResponse.json(
      { error: "Erreur lors du traitement" },
      { status: 500 }
    )
  }
}
