import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { EMAIL_TEMPLATES, sendEmail } from "@/lib/email"
import { logAdminActivity } from "@/lib/admin-activity"
import { validateRcFabriquantPaymentManually } from "@/lib/insurance-contract-service"
import { normalizeVirementReference } from "@/lib/client-echeances"

function formatFrDate(value: Date | null | undefined): string | null {
  if (!value) return null
  return value.toLocaleDateString("fr-FR")
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !isAdmin(session)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    let body: unknown = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }
    const raw = body && typeof body === "object" ? (body as Record<string, unknown>).virementReference : null
    const virementReference = normalizeVirementReference(raw)

    const { id } = await params
    const result = await validateRcFabriquantPaymentManually(id, session.user.email, virementReference)
    if (!result.ok) {
      if (result.error === "NOT_FOUND") {
        return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 })
      }
      if (result.error === "NOT_RC") {
        return NextResponse.json({ error: "Ce contrat n'est pas une RC fabriquant." }, { status: 400 })
      }
      if (result.error === "NOT_PAYABLE") {
        return NextResponse.json(
          { error: "Approuvez le contrat avant d'enregistrer le virement." },
          { status: 400 }
        )
      }
      if (result.error === "REFERENCE_REQUIRED") {
        return NextResponse.json(
          { error: "Indiquez le libellé ou la date du virement." },
          { status: 400 }
        )
      }
      if (result.error === "INVALID_AMOUNT") {
        return NextResponse.json({ error: "Le montant de l'échéance est invalide." }, { status: 400 })
      }
      if (result.error === "AMOUNT_MISMATCH") {
        return NextResponse.json(
          { error: "Le montant de l'échéance ne correspond pas au contrat." },
          { status: 400 }
        )
      }
      return NextResponse.json(
        {
          ok: true,
          emailSent: false,
          warning:
            "Virement enregistré. L'attestation n'a pas pu être générée : relancez « Générer l'attestation ».",
        },
        { status: 200 }
      )
    }

    const contract = await prisma.insuranceContract.findUnique({
      where: { id },
      select: {
        contractNumber: true,
        clientName: true,
        validFrom: true,
        validUntil: true,
        user: { select: { email: true, raisonSociale: true } },
      },
    })
    const email = contract?.user?.email?.trim().toLowerCase() || ""
    const du = formatFrDate(result.contract.validFrom ?? contract?.validFrom)
    const au = formatFrDate(result.contract.validUntil ?? contract?.validUntil)
    let emailSent = false
    let warning: string | undefined
    if (!result.idempotent && email) {
      const template = EMAIL_TEMPLATES.confirmationPaiementRcManuel(
        contract?.user?.raisonSociale || contract?.clientName || email,
        contract?.contractNumber || "",
        result.amount,
        du && au ? { du, au } : undefined
      )
      emailSent = await sendEmail({
        to: email,
        subject: template.subject,
        text: template.text,
        html: template.html,
      })
      if (!emailSent) {
        warning = "Virement validé. L'email de confirmation n'a pas été envoyé."
      }
    } else if (!result.idempotent && !email) {
      warning = "Virement validé. Aucun email client n'est lié à ce contrat."
    } else if (result.certificateReady === false) {
      warning =
        "Virement déjà enregistré. L'attestation n'a pas pu être générée : relancez « Générer l'attestation »."
    }

    await logAdminActivity({
      adminEmail: session.user.email,
      action: "rc_payment_validated_manually",
      targetType: "insurance_contract",
      targetId: id,
      details: {
        contractNumber: contract?.contractNumber,
        amount: result.amount,
        kind: result.kind,
        virementReference,
        idempotent: result.idempotent,
        emailSent,
      },
    })

    return NextResponse.json({
      ok: true,
      contractNumber: contract?.contractNumber,
      amount: result.amount,
      kind: result.kind,
      alreadyPaid: result.idempotent,
      emailSent,
      ...(warning ? { warning } : {}),
    })
  } catch (error) {
    console.error("[gestion/insurance-contracts/validate-rc-payment]", error)
    const duplicate =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    if (duplicate) {
      return NextResponse.json({
        ok: true,
        alreadyPaid: true,
        emailSent: false,
        warning: "La facture RC fabriquant existe déjà. Le virement et l'attestation restent enregistrés.",
      })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
