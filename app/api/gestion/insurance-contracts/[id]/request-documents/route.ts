import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { sendEmail } from "@/lib/email"
import { escapeHtmlForEmail } from "@/lib/email-layout"
import { prisma } from "@/lib/prisma"
import { logContractAction } from "@/lib/insurance-contract-service"
import { SITE_URL } from "@/lib/site-url"

const DO_REQUIRED_DOCUMENTS = [
  "Permis de construire ou autorisation d’urbanisme",
  "Plans du projet",
  "Étude de sol, si disponible",
  "Devis ou marchés des entreprises intervenantes",
  "Attestations décennales des entreprises intervenantes",
  "Pièce d’identité du maître d’ouvrage",
  "Justificatif de propriété ou compromis, si disponible",
]

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !isAdmin(session)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    const { id } = await params
    const contract = await prisma.insuranceContract.findUnique({
      where: { id },
      include: { user: { select: { email: true, raisonSociale: true } } },
    })

    if (!contract) {
      return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 })
    }
    if (contract.productType !== "do") {
      return NextResponse.json(
        { error: "Cette demande de pièces est réservée aux contrats DO." },
        { status: 400 }
      )
    }
    if (contract.status === "rejected") {
      return NextResponse.json(
        { error: "Impossible de demander des pièces sur un contrat DO refusé." },
        { status: 400 }
      )
    }

    const email = contract.user?.email?.trim().toLowerCase()
    if (!email) {
      return NextResponse.json(
        { error: "Aucun compte client/email lié au contrat. Créez ou rattachez d'abord l'accès client." },
        { status: 400 }
      )
    }

    const clientLabel = contract.user?.raisonSociale || contract.clientName || email
    const safeClientLabel = escapeHtmlForEmail(clientLabel)
    const safeContractNumber = escapeHtmlForEmail(contract.contractNumber)
    const espaceClientUrl = `${SITE_URL}/espace-client`
    const subject = `Pièces à ajouter pour votre dossier dommage-ouvrage ${contract.contractNumber}`
    const listText = DO_REQUIRED_DOCUMENTS.map((doc) => `- ${doc}`).join("\n")
    const listHtml = DO_REQUIRED_DOCUMENTS.map((doc) => `<li>${escapeHtmlForEmail(doc)}</li>`).join("")
    const text = [
      `Bonjour ${clientLabel},`,
      "",
      "Pour finaliser l’étude de votre dossier dommage-ouvrage, merci d’ajouter les pièces suivantes dans votre espace client :",
      "",
      listText,
      "",
      `Référence dossier : ${contract.contractNumber}`,
      "",
      "Espace client :",
      espaceClientUrl,
      "",
      "Cordialement,",
      "Optimum Assurance",
    ].join("\n")
    const html = `
      <p>Bonjour ${safeClientLabel},</p>
      <p>Pour finaliser l’étude de votre dossier <strong>dommage-ouvrage</strong>, merci d’ajouter les pièces suivantes dans votre espace client :</p>
      <ul>${listHtml}</ul>
      <p style="font-size:13px;color:#64748b;">Référence dossier : <strong>${safeContractNumber}</strong></p>
      <p><a href="${espaceClientUrl}" style="color:#2563eb;font-weight:bold;background:#eff6ff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Ajouter mes documents</a></p>
      <p>Cordialement,<br>Optimum Assurance</p>
    `.trim()

    const sent = await sendEmail({ to: email, subject, text, html })
    if (!sent) {
      return NextResponse.json(
        { error: "Envoi email impossible (Resend ou domaine expéditeur)." },
        { status: 503 }
      )
    }

    await logContractAction(
      contract.id,
      "do_documents_request_sent",
      { email, contractNumber: contract.contractNumber, requestedDocuments: DO_REQUIRED_DOCUMENTS },
      session.user.email
    )

    return NextResponse.json({ ok: true, sentTo: email })
  } catch (error) {
    console.error("[gestion/insurance-contracts/request-documents]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
