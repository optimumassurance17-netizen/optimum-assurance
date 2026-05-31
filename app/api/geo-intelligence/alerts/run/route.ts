import { NextRequest, NextResponse } from "next/server"
import { assertAdminSession } from "@/optimum-geo-intelligence/server/auth"
import { rateLimitGuard, withErrorHandling } from "@/optimum-geo-intelligence/server/security"
import { runAlertCenter } from "@/optimum-geo-intelligence/services/alerts"

export const runtime = "nodejs"

export const POST = withErrorHandling(async (request: NextRequest) => {
  const blocked = rateLimitGuard(request, "ogi-alerts-run", { max: 12, windowMs: 60_000 })
  if (blocked) return blocked
  await assertAdminSession()

  const result = await runAlertCenter()
  return NextResponse.json({ ok: true, result })
})
