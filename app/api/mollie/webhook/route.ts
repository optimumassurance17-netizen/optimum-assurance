import { NextRequest, NextResponse } from "next/server"
import { createMollieClient } from "@mollie/api-client"
import { randomBytes } from "crypto"
import React from "react"
import { Document } from "@react-pdf/renderer"
import { renderToBuffer } from "@react-pdf/renderer"
import { FactureDoPDFPage } from "@/lib/pdf-pages"
import { prisma } from "@/lib/prisma"
import { getNextNumero } from "@/lib/documents"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"
import {
  onSepaTrimestreFailed,
  onSepaTrimestrePaid,
  setupSepaSubscriptionAfterT1Card,
} from "@/lib/mollie-sepa"
import { processInsuranceContractPaymentSuccess } from "@/lib/insurance-contract-service"
import { getMolliePublicBaseUrl } from "@/lib/mollie-public-base-url"

function generateVerificationToken(): string {
  return randomBytes(16).toString("hex")
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.MOLLIE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Non configuré" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get("id")

    if (!paymentId) {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 })
    }

    const mollieClient = createMollieClient({ apiKey })
    const payment = await mollieClient.payments.get(paymentId)
    const metadata = (payment.metadata as Record<string, string>) || {}
    const email = metadata.email || (payment as { consumerEmail?: string }).consumerEmail

    if (payment.status === "paid") {
      if (metadata.type === "insurance_contract" && metadata.insuranceContractId) {
        const amount = payment.amount?.value ? parseFloat(payment.amount.value) : 0
        const result = await processInsuranceContractPaymentSuccess(
          metadata.insuranceContractId as string,
          paymentId,
          amount
        )
        if (!result.ok) {
          const noRetry =
            result.error === "NOT_FOUND" ||
            result.error === "INVALID_STATE_FOR_PAYMENT" ||
            result.error === "AMOUNT_MISMATCH"
          if (noRetry) {
            console.warn("[webhook] insurance_contract (ack, pas de retry utile):", result.error)
            return NextResponse.json({
              received: true,
              acknowledged: true,
              insuranceContract: { error: result.error },
            })
          }
          console.error("[webhook] insurance_contract (retry possible):", result.error)
          return NextResponse.json({ error: result.error }, { status: 500 })
        }
        return NextResponse.json({ received: true })
      }

      let user: { id: string; email: string; raisonSociale: string | null; adresse?: string | null; codePostal?: string | null; ville?: string | null } | null = null
      let facturePdfAttachment: { filename: string; content: Buffer } | undefined

      // Idempotence : si le paiement est déjà enregistré comme payé, ne pas recréer attestation/facture
      const existingPayment = await prisma.payment.findUnique({
        where: { molliePaymentId: paymentId },
        select: { status: true },
      })
      const alreadyProcessed = existingPayment?.status === "paid"

      if (metadata.type === "devis_do" && metadata.documentId) {
        const doc = await prisma.document.findUnique({
          where: { id: metadata.documentId },
          select: { userId: true, data: true, numero: true },
        })
        if (doc) {
          user = await prisma.user.findUnique({
            where: { id: doc.userId },
            select: { id: true, email: true, raisonSociale: true, adresse: true, codePostal: true, ville: true },
          })
          if (user && !alreadyProcessed) {
            const devisData = JSON.parse(doc.data) as {
              raisonSociale?: string
              adresseOperation?: string
              codePostal?: string
              ville?: string
              closCouvert?: boolean
              primeAnnuelle?: number
              fraisGestion?: number
              fraisCourtage?: number
              typeConstruction?: string
              destination?: string
            }
            const now = new Date()
            const dateSignature = now.toLocaleDateString("fr-FR")
            const dateEcheance = new Date(now)
            dateEcheance.setFullYear(dateEcheance.getFullYear() + 10)
            const dateEcheanceStr = dateEcheance.toLocaleDateString("fr-FR")

            const primeAnnuelle = devisData.primeAnnuelle ?? 0
            const fraisGestion = devisData.fraisGestion ?? 0
            const fraisCourtage = devisData.fraisCourtage ?? 0
            const totalTTC = primeAnnuelle + fraisGestion + fraisCourtage

            const attestationData = {
              raisonSociale: devisData.raisonSociale || user.raisonSociale || user.email,
              adresseOperation: devisData.adresseOperation,
              codePostal: devisData.codePostal,
              ville: devisData.ville,
              closCouvert: devisData.closCouvert ?? false,
              primeAnnuelle,
              dateSignature,
              dateEcheance: dateEcheanceStr,
            }

            const numeroAttDo = await getNextNumero("attestation_do")
            await prisma.document.create({
              data: {
                userId: user.id,
                type: "attestation_do",
                numero: numeroAttDo,
                data: JSON.stringify(attestationData),
                verificationToken: generateVerificationToken(),
                status: "valide",
              },
            })

            const factureData = {
              raisonSociale: devisData.raisonSociale || user.raisonSociale || user.email,
              adresse: user.adresse,
              codePostal: user.codePostal,
              ville: user.ville,
              email: user.email,
              adresseOperation: devisData.adresseOperation,
              typeConstruction: devisData.typeConstruction,
              destination: devisData.destination,
              closCouvert: devisData.closCouvert ?? false,
              primeAnnuelle,
              fraisGestion,
              fraisCourtage,
              totalTTC,
              datePaiement: dateSignature,
              numeroDevis: doc.numero,
            }

            const numeroFacture = await getNextNumero("facture_do")
            await prisma.document.create({
              data: {
                userId: user.id,
                type: "facture_do",
                numero: numeroFacture,
                data: JSON.stringify(factureData),
                status: "valide",
              },
            })

            // Pièce jointe : facture acquittée en PDF (envoyée plus bas avec l'email)
            try {
              const pdfEl = React.createElement(Document, {}, React.createElement(FactureDoPDFPage, { numero: numeroFacture, data: factureData }))
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- renderToBuffer attend un Document react-pdf
              const pdfBuffer = await renderToBuffer(pdfEl as any)
              facturePdfAttachment = { filename: `facture-${numeroFacture}.pdf`, content: Buffer.from(pdfBuffer) }
            } catch (e) {
              console.warn("Impossible de générer la facture PDF pour pièce jointe:", e)
            }
          }
        }
      } else if (metadata.userId) {
        user = await prisma.user.findUnique({
          where: { id: metadata.userId },
          select: { id: true, email: true, raisonSociale: true },
        })
      } else if (email) {
        user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, raisonSociale: true },
        })
      }

      // Mandat SEPA Mollie (T2–T4) après 1er trimestre CB — idempotent côté DB
      if (
        user &&
        metadata.premierPaiementCarte === "true" &&
        metadata.iban &&
        metadata.type !== "devis_do"
      ) {
        const baseUrl = getMolliePublicBaseUrl()
        const setup = await setupSepaSubscriptionAfterT1Card(mollieClient, {
          userId: user.id,
          email: metadata.email || user.email,
          raisonSociale: metadata.raisonSociale || user.raisonSociale || "",
          iban: metadata.iban,
          titulaireCompte: metadata.titulaireCompte || metadata.raisonSociale || "",
          primeAnnuelle: parseFloat(metadata.primeAnnuelle || "0") || 0,
          baseUrl,
        })
        if (!setup.ok && setup.error) {
          console.error("[webhook] SEPA setup:", setup.error)
        }
      }

      if (metadata.type === "sepa_trimestre" && metadata.sepaSubscriptionId && !alreadyProcessed) {
        await onSepaTrimestrePaid(metadata.sepaSubscriptionId)
      }

      if (user) {
        const amount = payment.amount?.value ? parseFloat(payment.amount.value) : 0
        await prisma.payment.upsert({
          where: { molliePaymentId: paymentId },
          create: {
            userId: user.id,
            molliePaymentId: paymentId,
            amount,
            status: "paid",
            paidAt: new Date(),
            metadata: JSON.stringify(metadata),
          },
          update: {
            status: "paid",
            paidAt: new Date(),
          },
        })

        if (metadata.type === "devis_do") {
          const template = EMAIL_TEMPLATES.confirmationPaiementDo(
            metadata.raisonSociale || user.raisonSociale || user.email,
            metadata.documentNumero || "",
            amount
          )
          await sendEmail({
            to: user.email,
            subject: template.subject,
            text: template.text,
            html: (template as { html?: string }).html,
            attachments: facturePdfAttachment ? [facturePdfAttachment] : undefined,
          })
        } else if (metadata.type !== "sepa_trimestre") {
          const template = EMAIL_TEMPLATES.confirmationSouscription(
            metadata.raisonSociale || user.raisonSociale || user.email
          )
          await sendEmail({
            to: user.email,
            subject: template.subject,
            text: template.text,
            html: (template as { html?: string }).html,
          })
        }
      }
    } else if (payment.status === "failed") {
      await prisma.payment.updateMany({
        where: { molliePaymentId: paymentId },
        data: { status: "failed" },
      })
      if (metadata.type === "sepa_trimestre" && metadata.sepaSubscriptionId) {
        const reason =
          (payment as { details?: { failureReason?: string } }).details?.failureReason ||
          "Échec du prélèvement SEPA"
        await onSepaTrimestreFailed(metadata.sepaSubscriptionId, reason)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Erreur webhook Mollie:", error)
    return NextResponse.json({ error: "Erreur webhook" }, { status: 500 })
  }
}
