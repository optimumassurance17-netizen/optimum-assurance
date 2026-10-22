import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { EMAIL_TEMPLATES, sendEmail } from "@/lib/email"
import { logAdminActivity } from "@/lib/admin-activity"
import { validateDoPaymentManually } from "@/lib/insurance-contract-service"

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
    const result = await validateDoPaymentManually(id, session.user.email)
    if (!result.ok) {
      if (result.error === "NOT_FOUND") {
        return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 })
      }
      if (result.error === "NOT_DO") {
        return NextResponse.json({ error: "Ce contrat n'est pas un dommage ouvrage." }, { status: 400 })
      }
      if (result.error === "NOT_APPROVED") {
        return NextResponse.json(
          { error: "Approuvez le contrat avant de valider le paiement." },
          { status: 400 }
        )
      }
      return NextResponse.json(
        {
          ok: true,
          emailSent: false,
          warning:
            "Paiement enregistré. L'attestation n'a pas pu être générée : relancez « Valider le paiement ».",
        },
        { status: 200 }
      )
    }

    const contract = await prisma.insuranceContract.findUnique({
      where: { id },
      select: {
        contractNumber: true,
        clientName: true,
        user: { select: { email: true, raisonSociale: true } },
      },
    })
    const email = contract?.user?.email?.trim().toLowerCase() || ""
    let emailSent = false
    let warning: string | undefined
    if (!result.idempotent && email) {
      const template = EMAIL_TEMPLATES.confirmationPaiementDoManuel(
        contract?.user?.raisonSociale || contract?.clientName || email,
        contract?.contractNumber || "",
        result.amount
      )
      emailSent = await sendEmail({
        to: email,
        subject: template.subject,
        text: template.text,
        html: template.html,
      })
      if (!emailSent) {
        warning = "Paiement validé. L'email de confirmation n'a pas été envoyé."
      }
    } else if (!result.idempotent && !email) {
      warning = "Paiement validé. Aucun email client n'est lié à ce contrat."
    } else if (result.idempotent && result.certificateReady === false) {
      warning =
        "Paiement déjà enregistré. L'attestation n'a pas pu être générée : relancez « Valider le paiement »."
    }

    await logAdminActivity({
      adminEmail: session.user.email,
      action: "do_payment_validated_manually",
      targetType: "insurance_contract",
      targetId: id,
      details: {
        contractNumber: contract?.contractNumber,
        amount: result.amount,
        idempotent: result.idempotent,
        emailSent,
      },
    })

    return NextResponse.json({
      ok: true,
      contractNumber: contract?.contractNumber,
      amount: result.amount,
      alreadyPaid: result.idempotent,
      emailSent,
      ...(warning ? { warning } : {}),
    })
  } catch (error) {
    console.error("[gestion/insurance-contracts/validate-do-payment]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
