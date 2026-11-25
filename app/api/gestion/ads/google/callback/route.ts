import { NextRequest, NextResponse } from "next/server"
import { logAdminActivity } from "@/lib/admin-activity"
import {
  GOOGLE_ADS_STATE_COOKIE,
  exchangeGoogleAdsCode,
  googleAccountEmail,
  readGoogleAdsState,
  saveGoogleAdsConnection,
} from "@/lib/google-ads"
import { gestionUnauthorized, requireGestionAdmin } from "@/lib/gestion-admin"

export const dynamic = "force-dynamic"

function publicOrigin(request: Request): string {
  const configured = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "").trim()
  if (configured) return configured.replace(/\/$/, "")
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}`
}

function back(request: Request, params: Record<string, string>) {
  const url = new URL("/gestion/publicite", publicOrigin(request))
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  const response = NextResponse.redirect(url)
  response.cookies.set(GOOGLE_ADS_STATE_COOKIE, "", { path: "/api/gestion/ads/google/callback", maxAge: 0 })
  return response
}

export async function GET(request: NextRequest) {
  const session = await requireGestionAdmin()
  if (!session?.user?.email) return gestionUnauthorized()

  const url = new URL(request.url)
  const error = url.searchParams.get("error")
  if (error) return back(request, { google: "erreur" })

  const code = url.searchParams.get("code") || ""
  const state = url.searchParams.get("state") || ""
  const decodedCookie = request.cookies.get(GOOGLE_ADS_STATE_COOKIE)?.value || ""
  const signed = readGoogleAdsState(state)
  if (!code || !signed || decodedCookie !== state || signed.email !== session.user.email.toLowerCase()) {
    return back(request, { google: "erreur" })
  }

  try {
    const refreshToken = await exchangeGoogleAdsCode(publicOrigin(request), code)
    const accountEmail = await googleAccountEmail(refreshToken).catch(() => null)
    await saveGoogleAdsConnection({
      refreshToken,
      accountEmail,
      connectedByEmail: session.user.email,
    })
    await logAdminActivity({
      adminEmail: session.user.email,
      action: "google_ads_connect",
      targetType: "ads",
      details: { accountEmail },
    })
    return back(request, { google: "connecte" })
  } catch {
    return back(request, { google: "erreur" })
  }
}
