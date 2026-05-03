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

export async function POST(request: NextRequest) {
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
    const email = body.email as string | undefined
    const recipientEmail = (email || session?.user?.email || "").trim().toLowerCase()

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
          needsSummary: body.needsSummary,
          recommendedProduct: body.recommendedProduct,
        }
      )
      clientEmailSent = await sendEmail({
        to: recipientEmail,
        subject: tpl.subject,
        text: tpl.text,
        html: tpl.html,
      })
    }

    await logAdminActivity({
      adminEmail: "dda@system",
      action: "dda_advice_acknowledged",
      targetType: "devoir_conseil_log",
      targetId: log.id,
      details: { ...buildDdaLogDetails(body), clientEmailSent },
    })

    return NextResponse.json({ ok: true, clientEmailSent })
  } catch (error) {
    console.error("Erreur log devoir conseil:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
