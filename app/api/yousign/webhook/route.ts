import { NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"
import { prisma } from "@/lib/prisma"
import { getNextNumero } from "@/lib/documents"

/**
 * Calcule la date 3 mois avant une date ISO (AAAA-MM-JJ)
 */
function dateMoins3Mois(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  date.setMonth(date.getMonth() - 3)
  return date.toISOString().split("T")[0]
}

/**
 * Vérifie la signature HMAC SHA-256 du webhook YouSign
 * Header X-Yousign-Signature-256, format: sha256=<hex>
 */
function verifyYousignSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!secret || !signature) return false
  const hmac = createHmac("sha256", secret)
  hmac.update(rawBody)
  const computed = "sha256=" + hmac.digest("hex")
  if (signature.length !== computed.length) return false
  try {
    return timingSafeEqual(Buffer.from(signature, "utf8"), Buffer.from(computed, "utf8"))
  } catch {
    return false
  }
}

/**
 * Webhook Yousign - notifications signature complétée
 * Configurer dans le dashboard Yousign : https://app.yousign.com
 * Événements : signature_request.completed, signature_request.declined
 * Sécurité : vérification X-Yousign-Signature-256 si YOUSIGN_WEBHOOK_SECRET est défini
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get("x-yousign-signature-256")
    const secret = process.env.YOUSIGN_WEBHOOK_SECRET

    if (secret && !verifyYousignSignature(rawBody, signature, secret)) {
      console.warn("[Yousign Webhook] Signature invalide - requête rejetée")
      return NextResponse.json({ error: "Signature invalide" }, { status: 401 })
    }

    const body = JSON.parse(rawBody) as { event_name?: string; data?: { signature_request?: { id?: string } } }
    const { event_name, data } = body

    if (event_name === "signature_request.completed") {
      const signatureRequestId = data?.signature_request?.id
      if (signatureRequestId) {
        const pending = await prisma.pendingSignature.findUnique({
          where: { signatureRequestId },
        })

        if (pending) {
          const contractData = JSON.parse(pending.contractData) as Record<string, unknown>

          // Créer le document contrat en BDD
          await prisma.document.create({
            data: {
              userId: pending.userId,
              type: "contrat",
              numero: pending.contractNumero,
              data: JSON.stringify(contractData),
              status: "valide",
            },
          })

          // Créer attestation de non sinistralité si jamais assuré ou reprise du passé
          const jamaisAssure = Boolean(contractData.jamaisAssure)
          const reprisePasse = Boolean(contractData.reprisePasse)
          const dateEffetIso = contractData.dateEffetIso as string | undefined
          const dateCreationSociete = contractData.dateCreationSociete as string | undefined

          const doitCreerAttestation =
            dateEffetIso &&
            ((jamaisAssure && dateCreationSociete) || reprisePasse)

          if (doitCreerAttestation) {
            let dateDebut: string
            let motif: "jamais_assure" | "reprise_passe"

            if (jamaisAssure && dateCreationSociete) {
              dateDebut = dateCreationSociete
              motif = "jamais_assure"
            } else {
              dateDebut = dateMoins3Mois(dateEffetIso)
              motif = "reprise_passe"
            }

            const attestationData = {
              raisonSociale: contractData.raisonSociale,
              siret: contractData.siret || "",
              adresse: contractData.adresse,
              codePostal: contractData.codePostal,
              ville: contractData.ville,
              dateDebut,
              dateFin: dateEffetIso,
              motif,
            }

            const numeroAns = await getNextNumero("attestation_non_sinistralite")
            await prisma.document.create({
              data: {
                userId: pending.userId,
                type: "attestation_non_sinistralite",
                numero: numeroAns,
                data: JSON.stringify(attestationData),
                status: "valide",
              },
            })
            console.log(`[Yousign Webhook] Attestation non sinistralité ${numeroAns} créée pour userId ${pending.userId}`)
          }

          // Supprimer la pending signature (évite doublons)
          await prisma.pendingSignature.delete({
            where: { signatureRequestId },
          })

          console.log(`[Yousign Webhook] Contrat ${pending.contractNumero} créé pour userId ${pending.userId}`)
        } else {
          console.log(`[Yousign Webhook] Signature complétée mais pending introuvable: ${signatureRequestId}`)
        }
      }
    } else if (event_name === "signature_request.declined") {
      const signatureRequestId = data?.signature_request?.id
      if (signatureRequestId) {
        await prisma.pendingSignature.deleteMany({ where: { signatureRequestId } })
        console.log(`[Yousign Webhook] Signature refusée, pending supprimé: ${signatureRequestId}`)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Erreur webhook Yousign:", error)
    return NextResponse.json({ error: "Erreur webhook" }, { status: 500 })
  }
}
