import { NextResponse } from "next/server"
import { logAdminActivity } from "@/lib/admin-activity"
import { disconnectGoogleAds } from "@/lib/google-ads"
import { gestionUnauthorized, requireGestionAdmin } from "@/lib/gestion-admin"

export const dynamic = "force-dynamic"

export async function POST() {
  const session = await requireGestionAdmin()
  if (!session?.user?.email) return gestionUnauthorized()
  await disconnectGoogleAds()
  await logAdminActivity({
    adminEmail: session.user.email,
    action: "google_ads_disconnect",
    targetType: "ads",
  })
  return NextResponse.json({ ok: true })
}
