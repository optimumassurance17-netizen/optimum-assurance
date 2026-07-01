import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { sendEmail } from "@/lib/email"
import { escapeHtmlForEmail } from "@/lib/email-layout"
import { prisma } from "@/lib/prisma"
import { logContractAction } from "@/lib/insurance-contract-service"
import { renderContractPdf } from "@/lib/insurance-contract-pdf"
import { SITE_URL } from "@/lib/site-url"

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
        { error: "L'envoi de devis depuis ce bouton est réservé aux contrats DO." },
        { status: 400 }
      )
    }
    if (contract.status === "rejected") {
      return NextResponse.json(
        { error: "Impossible d'envoyer un devis DO refusé." },
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

    const pdfBytes = await renderContractPdf(contract, "quote")
    const clientLabel = contract.user?.raisonSociale || contract.clientName || email
    const safeClientLabel = escapeHtmlForEmail(clientLabel)
    const safeContractNumber = escapeHtmlForEmail(contract.contractNumber)
    const espaceClientUrl = `${SITE_URL}/espace-client#contrats-plateforme`
    const subject = `Votre devis dommage-ouvrage ${contract.contractNumber} - Optimum Assurance`
    const text = [
      `Bonjour ${clientLabel},`,
      "",
      "Veuillez trouver en pièce jointe votre devis dommage-ouvrage et les conditions particulières associées.",
      "",
      `Référence : ${contract.contractNumber}`,
      `Montant TTC : ${contract.premium.toLocaleString("fr-FR")} €`,
      "",
      "Vous pouvez également retrouver ce document dans votre espace client :",
      espaceClientUrl,
      "",
      "Cordialement,",
      "Optimum Assurance",
    ].join("\n")
    const html = `
      <p>Bonjour ${safeClientLabel},</p>
      <p>Veuillez trouver en pièce jointe votre <strong>devis dommage-ouvrage</strong> et les conditions particulières associées.</p>
      <p style="font-size:13px;color:#64748b;">Référence : <strong>${safeContractNumber}</strong><br>Montant TTC : <strong>${contract.premium.toLocaleString("fr-FR")} €</strong></p>
      <p><a href="${espaceClientUrl}" style="color:#2563eb;font-weight:bold;background:#eff6ff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Accéder à mon espace client</a></p>
      <p>Cordialement,<br>Optimum Assurance</p>
    `.trim()

    const sent = await sendEmail({
      to: email,
      subject,
      text,
      html,
      attachments: [
        {
          filename: `${contract.contractNumber}-devis-do.pdf`,
          content: Buffer.from(pdfBytes),
        },
      ],
    })

    if (!sent) {
      return NextResponse.json(
        { error: "Envoi email impossible (Resend ou domaine expéditeur)." },
        { status: 503 }
      )
    }

    await logContractAction(
      contract.id,
      "do_quote_email_sent",
      { email, contractNumber: contract.contractNumber },
      session.user.email
    )

    return NextResponse.json({ ok: true, sentTo: email })
  } catch (error) {
    console.error("[gestion/insurance-contracts/send-quote]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
