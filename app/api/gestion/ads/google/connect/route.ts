import { NextResponse } from "next/server"
import {
  GOOGLE_ADS_STATE_COOKIE,
  createGoogleAdsState,
  googleAdsAuthUrl,
  googleAdsOAuthReady,
} from "@/lib/google-ads"
import { gestionUnauthorized, requireGestionAdmin } from "@/lib/gestion-admin"

export const dynamic = "force-dynamic"

function publicOrigin(request: Request): string {
  const configured = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "").trim()
  if (configured) return configured.replace(/\/$/, "")
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}`
}

export async function GET(request: Request) {
  const session = await requireGestionAdmin()
  if (!session?.user?.email) return gestionUnauthorized()
  if (!googleAdsOAuthReady()) {
    return NextResponse.json(
      { error: "Renseignez GOOGLE_ADS_CLIENT_ID et GOOGLE_ADS_CLIENT_SECRET avant de connecter Google Ads." },
      { status: 503 }
    )
  }

  const state = createGoogleAdsState(session.user.email)
  const response = NextResponse.redirect(googleAdsAuthUrl(publicOrigin(request), state))
  response.cookies.set(GOOGLE_ADS_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/gestion/ads/google/callback",
    maxAge: 10 * 60,
  })
  return response
}
