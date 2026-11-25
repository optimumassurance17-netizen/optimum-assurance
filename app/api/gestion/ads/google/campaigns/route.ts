import { NextResponse } from "next/server"
import { listGoogleAdsCampaigns } from "@/lib/google-ads"
import { gestionUnauthorized, requireGestionAdmin } from "@/lib/gestion-admin"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await requireGestionAdmin()
  if (!session) return gestionUnauthorized()
  try {
    const campaigns = await listGoogleAdsCampaigns()
    return NextResponse.json({ campaigns })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lecture des campagnes impossible."
    return NextResponse.json({ error: message.slice(0, 180) }, { status: 502 })
  }
}
