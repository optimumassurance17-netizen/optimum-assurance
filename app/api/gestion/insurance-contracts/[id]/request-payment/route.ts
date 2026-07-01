import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { CONTRACT_STATUS } from "@/lib/insurance-contract-status"
import { EMAIL_TEMPLATES, sendEmail } from "@/lib/email"
import {
  logContractAction,
  mollieExpectedAmountForInsuranceContract,
} from "@/lib/insurance-contract-service"
import {
  getInsuranceProductLabel,
  insuranceProductUsesDirectMollieAfterApproval,
} from "@/lib/insurance-product"
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
      select: {
        id: true,
        contractNumber: true,
        productType: true,
        clientName: true,
        premium: true,
        status: true,
        paidAt: true,
        user: { select: { email: true, raisonSociale: true } },
      },
    })

    if (!contract) {
      return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 })
    }
    if (!insuranceProductUsesDirectMollieAfterApproval(contract.productType)) {
      return NextResponse.json(
        { error: "Ce produit n'utilise pas la demande de paiement Mollie depuis la gestion." },
        { status: 400 }
      )
    }
    if (
      contract.status !== CONTRACT_STATUS.approved &&
      !(contract.status === CONTRACT_STATUS.active && contract.productType === "rc_fabriquant")
    ) {
      return NextResponse.json(
        { error: "Le contrat doit être approuvé avant d'envoyer une demande de paiement." },
        { status: 400 }
      )
    }
    if (contract.paidAt && contract.productType !== "rc_fabriquant") {
      return NextResponse.json({ error: "Ce contrat est déjà payé." }, { status: 400 })
    }

    const email = contract.user?.email?.trim().toLowerCase()
    if (!email) {
      return NextResponse.json(
        { error: "Aucun compte client/email lié au contrat. Créez ou rattachez d'abord l'accès client." },
        { status: 400 }
      )
    }

    const amount = mollieExpectedAmountForInsuranceContract(contract.productType, contract.premium)
    const produitLabel = getInsuranceProductLabel(contract.productType)
    const espaceClientUrl = `${SITE_URL}/espace-client#contrats-plateforme`
    const template = EMAIL_TEMPLATES.rappelPaiementContrat(
      contract.user?.raisonSociale || contract.clientName || email,
      produitLabel,
      amount,
      espaceClientUrl,
      email,
      { reference: contract.contractNumber }
    )

    const sent = await sendEmail({
      to: email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    })
    if (!sent) {
      return NextResponse.json(
        { error: "Envoi email impossible (Resend ou domaine expéditeur)." },
        { status: 503 }
      )
    }

    await logContractAction(
      contract.id,
      "payment_request_sent",
      {
        email,
        productType: contract.productType,
        amount,
        espaceClientUrl,
      },
      session.user.email
    )

    return NextResponse.json({ ok: true, sentTo: email, amount })
  } catch (error) {
    console.error("[gestion/insurance-contracts/request-payment]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
