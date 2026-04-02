import { NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"
import { prisma } from "@/lib/prisma"
import { applyPendingFinalize } from "@/lib/yousign-finalize-pending"

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
 * Événements Yousign v3 : signature_request.done (terminé), signature_request.declined ;
 *   alias legacy : signature_request.completed
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

    if (
      event_name === "signature_request.done" ||
      event_name === "signature_request.completed"
    ) {
      const signatureRequestId = data?.signature_request?.id
      if (signatureRequestId) {
        const pending = await prisma.pendingSignature.findUnique({
          where: { signatureRequestId },
        })

        if (pending) {
          const duplicate = await prisma.document.findFirst({
            where: {
              userId: pending.userId,
              type: "contrat",
              numero: pending.contractNumero,
            },
          })
          if (duplicate) {
            await prisma.pendingSignature.deleteMany({ where: { signatureRequestId } })
            console.log(`[Yousign Webhook] Doublon évité, pending supprimé: ${signatureRequestId}`)
          } else {
            await applyPendingFinalize(pending)
            console.log(`[Yousign Webhook] Contrat ${pending.contractNumero} créé pour userId ${pending.userId}`)
          }
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
