import { NextResponse } from "next/server"
import { getGoogleAdsConnectionView, googleAdsOAuthReady, googleAdsReadReady } from "@/lib/google-ads"
import { gestionUnauthorized, requireGestionAdmin } from "@/lib/gestion-admin"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await requireGestionAdmin()
  if (!session) return gestionUnauthorized()

  let connection = null
  let storageReady = true
  try {
    connection = await getGoogleAdsConnectionView()
  } catch {
    storageReady = false
  }

  return NextResponse.json({
    configured: googleAdsOAuthReady(),
    developerToken: googleAdsReadReady(),
    openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
    storageReady,
    connection,
  })
}
