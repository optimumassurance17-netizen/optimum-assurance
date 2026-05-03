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

    const log = await prisma.devoirConseilLog.create({
      data: {
        email: email || session?.user?.email || null,
        userId: session?.user?.id || null,
        page,
        produit,
      },
    })

    await logAdminActivity({
      adminEmail: "dda@system",
      action: "dda_advice_acknowledged",
      targetType: "devoir_conseil_log",
      targetId: log.id,
      details: buildDdaLogDetails(body),
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Erreur log devoir conseil:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
