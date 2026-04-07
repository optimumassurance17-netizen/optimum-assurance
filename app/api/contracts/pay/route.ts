import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { Prisma } from "@/lib/prisma-client"
import { createMollieClient, Locale, PaymentMethod } from "@mollie/api-client"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CONTRACT_STATUS } from "@/lib/insurance-contract-status"
import {
  mollieExpectedAmountForInsuranceContract,
  premiumMatchesMollieAmount,
} from "@/lib/insurance-contract-service"
import { insuranceContractPayLockKeys } from "@/lib/insurance-contract-pay-lock"
import { getMolliePublicBaseUrl } from "@/lib/mollie-public-base-url"
import { asJsonObject } from "@/lib/json-object"

/** Statuts Mollie pour lesquels le client peut encore utiliser le même paiement. */
const MOLLIE_REUSABLE_STATUSES = new Set(["open", "pending", "authorized"])

/**
 * Crée un paiement Mollie (virement) pour un InsuranceContract approuvé.
 * Verrou advisory PostgreSQL par contrat pour éviter deux créations en parallèle.
 * Réutilise un paiement Mollie encore ouvert si le montant correspond.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const apiKey = process.env.MOLLIE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Mollie non configuré" }, { status: 503 })
  }

  const userId = session.user.id

  try {
    const body = asJsonObject<{ contractId?: string }>(await request.json())
    if (!body.contractId) {
      return NextResponse.json({ error: "contractId requis" }, { status: 400 })
    }

    const contractPreview = await prisma.insuranceContract.findFirst({
      where: {
        id: body.contractId,
        userId,
        OR: [
          { status: CONTRACT_STATUS.approved },
          /** RC Fabriquant : échéances suivantes après activation (trimestriel manuel). */
          { status: CONTRACT_STATUS.active, productType: "rc_fabriquant" },
        ],
      },
    })

    if (!contractPreview) {
      return NextResponse.json({ error: "Contrat introuvable ou non payable" }, { status: 404 })
    }

    const amount = mollieExpectedAmountForInsuranceContract(
      contractPreview.productType,
      contractPreview.premium
    )
    if (amount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 })
    }

    const email = session.user.email?.trim()
    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 })
    }

    const baseUrl = getMolliePublicBaseUrl()
    const due = new Date()
    due.setDate(due.getDate() + 14)
    const dueDate = due.toISOString().slice(0, 10)

    const mollieClient = createMollieClient({ apiKey })
    const contractId = contractPreview.id

    const payload = await prisma.$transaction(async (tx) => {
      const [k1, k2] = insuranceContractPayLockKeys(contractId)
      await tx.$executeRawUnsafe(
        "SELECT pg_advisory_xact_lock($1::integer, $2::integer)",
        k1,
        k2
      )

      const contract = await tx.insuranceContract.findFirst({
        where: {
          id: contractId,
          userId,
          OR: [
            { status: CONTRACT_STATUS.approved },
            { status: CONTRACT_STATUS.active, productType: "rc_fabriquant" },
          ],
        },
      })

      if (!contract) {
        return { type: "gone" as const }
      }

      const priorPayments = await tx.contractLifecyclePayment.findMany({
        where: { contractId },
        orderBy: { createdAt: "desc" },
        take: 20,
      })

      for (const row of priorPayments) {
        if (!premiumMatchesMollieAmount(amount, row.amount)) continue
        try {
          const existing = await mollieClient.payments.get(row.molliePaymentId)
          const st = existing.status as string

          if (st !== row.status) {
            await tx.contractLifecyclePayment.update({
              where: { id: row.id },
              data: { status: st },
            })
          }

          if (!MOLLIE_REUSABLE_STATUSES.has(st)) continue

          const remoteAmount = existing.amount?.value ? parseFloat(existing.amount.value) : 0
          if (!premiumMatchesMollieAmount(amount, remoteAmount)) continue

          const checkoutUrl = existing._links?.checkout?.href
          if (!checkoutUrl) continue

          return {
            type: "reuse" as const,
            id: existing.id,
            checkoutUrl,
            amount,
          }
        } catch (e) {
          console.warn("[contracts/pay] relire Mollie", row.molliePaymentId, e)
        }
      }

      const payment = await mollieClient.payments.create({
        amount: { currency: "EUR", value: String(amount.toFixed(2)) },
        description: `Assurance ${contract.productType} — ${contract.contractNumber}`,
        redirectUrl: `${baseUrl}/confirmation`,
        webhookUrl: `${baseUrl}/api/mollie/webhook`,
        method: PaymentMethod.banktransfer,
        locale: Locale.fr_FR,
        billingEmail: email,
        dueDate,
        metadata: {
          type: "insurance_contract",
          insuranceContractId: contract.id,
          email,
          raisonSociale: contract.clientName,
        },
      })

      try {
        await tx.contractLifecyclePayment.create({
          data: {
            contractId: contract.id,
            molliePaymentId: payment.id,
            amount,
            status: payment.status,
          },
        })
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          /* webhook ou doublon — ignorer */
        } else {
          throw err
        }
      }

      return {
        type: "new" as const,
        id: payment.id,
        checkoutUrl: payment._links?.checkout?.href,
        amount,
      }
    })

    if (payload.type === "gone") {
      return NextResponse.json({ error: "Contrat introuvable ou non payable" }, { status: 404 })
    }

    if (!payload.checkoutUrl) {
      return NextResponse.json({ error: "Lien de paiement indisponible" }, { status: 502 })
    }

    return NextResponse.json({
      id: payload.id,
      checkoutUrl: payload.checkoutUrl,
      amount: payload.amount,
      reused: payload.type === "reuse",
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Erreur paiement" }, { status: 500 })
  }
}
