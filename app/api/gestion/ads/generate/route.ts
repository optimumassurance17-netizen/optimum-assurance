import { NextResponse } from "next/server"
import { generateAdsPack, normalizeAdsProduct } from "@/lib/ads-robot"
import { gestionUnauthorized, requireGestionAdmin } from "@/lib/gestion-admin"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const session = await requireGestionAdmin()
  if (!session) return gestionUnauthorized()
  const body = (await request.json().catch(() => ({}))) as {
    product?: string
    city?: string
    angle?: string
  }
  const pack = await generateAdsPack({
    product: normalizeAdsProduct(body.product),
    city: body.city,
    angle: body.angle,
  })
  return NextResponse.json(pack)
}
