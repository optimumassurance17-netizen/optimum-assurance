import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { asJsonObject } from "@/lib/json-object"
import {
  buildDdaLogDetails,
  normalizeDdaProduct,
  normalizeDdaSourcePage,
} from "@/lib/dda-compliance"
import { logAdminActivity } from "@/lib/admin-activity"
import { EMAIL_TEMPLATES, sendEmail } from "@/lib/email"
import { getDevoirConseilContent } from "@/lib/devoir-conseil"
import { SITE_URL } from "@/lib/site-url"
import { checkRateLimitMemory, rateLimitResponse } from "@/lib/rate-limit"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_EMAIL_FIELD_LENGTH = 254
const MAX_SUMMARY_LENGTH = 1200
const MAX_RECOMMENDATION_LENGTH = 120

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null
  const email = value.trim().toLowerCase()
  if (!email) return null
  if (email.length > MAX_EMAIL_FIELD_LENGTH || !EMAIL_PATTERN.test(email)) return null
  return email
}

function trimOptional(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, maxLength)
}

export async function POST(request: NextRequest) {
  const limited = await rateLimitResponse(request, "ddaEmail")
  if (limited) return limited

  try {
    const body = asJsonObject<{
      page?: string
      produit?: string
      email?: string
      sourcePage?: string
      sourcePath?: string
      needsSummary?: string
      needsVersion?: string
      recommendedProduct?: string
      suitabilityScore?: number
      context?: Record<string, unknown>
    }>(await request.json())
    const page = normalizeDdaSourcePage(body.page)
    const produit = normalizeDdaProduct(body.produit)

    if (!page || !produit) {
      return NextResponse.json({ error: "page et produit requis" }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    const submittedEmail = normalizeEmail(body.email)
    const sessionEmail = normalizeEmail(session?.user?.email)

    if (typeof body.email === "string" && body.email.trim() && !submittedEmail) {
      return NextResponse.json({ error: "email invalide" }, { status: 400 })
    }

    // En session connectee, l'email serveur prime pour eviter l'envoi vers une adresse arbitraire.
    const recipientEmail = sessionEmail || submittedEmail || ""
    const needsSummary = trimOptional(body.needsSummary, MAX_SUMMARY_LENGTH)
    const recommendedProduct = trimOptional(body.recommendedProduct, MAX_RECOMMENDATION_LENGTH)

    if (recipientEmail) {
      const recipientLimit = checkRateLimitMemory(`ddaEmail:recipient:${recipientEmail}`, 3, 10 * 60_000)
      if (!recipientLimit.ok) {
        return NextResponse.json(
          { error: "Trop de confirmations envoyées à cette adresse. Réessayez plus tard." },
          { status: 429, headers: { "Retry-After": String(recipientLimit.retryAfterSec) } }
        )
      }
    }

    const log = await prisma.devoirConseilLog.create({
      data: {
        email: recipientEmail || null,
        userId: session?.user?.id || null,
        page,
        produit,
      },
    })

    let clientEmailSent = false
    if (recipientEmail) {
      const conseil = getDevoirConseilContent(produit)
      const tpl = EMAIL_TEMPLATES.devoirConseilConfirme(
        session?.user?.name || recipientEmail,
        {
          produitLabel:
            produit === "decennale"
              ? "assurance décennale"
              : produit === "dommage-ouvrage"
                ? "dommage ouvrage"
                : "RC fabricant",
          acceptedAt: log.acceptedAt.toLocaleString("fr-FR"),
          contenu: conseil.contenu,
          liens: [
            { label: "CGV", href: `${SITE_URL}${conseil.lienCgv}` },
            { label: "Conditions attestations", href: `${SITE_URL}${conseil.lienAttestations}` },
            { label: "FAQ", href: `${SITE_URL}${conseil.lienFaq}` },
            { label: "Guide", href: `${SITE_URL}${conseil.lienGuide}` },
          ],
          needsSummary,
          recommendedProduct,
        }
      )
      try {
        clientEmailSent = await sendEmail({
          to: recipientEmail,
          subject: tpl.subject,
          text: tpl.text,
          html: tpl.html,
        })
      } catch (emailError) {
        console.error("Erreur envoi email devoir conseil:", emailError)
      }
    }

    await logAdminActivity({
      adminEmail: "dda@system",
      action: "dda_advice_acknowledged",
      targetType: "devoir_conseil_log",
      targetId: log.id,
      details: {
        ...buildDdaLogDetails({
          ...body,
          needsSummary,
          recommendedProduct,
        }),
        clientEmailSent,
      },
    })

    return NextResponse.json({ ok: true, clientEmailSent })
  } catch (error) {
    console.error("Erreur log devoir conseil:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
