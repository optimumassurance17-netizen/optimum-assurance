import { NextRequest, NextResponse } from "next/server"
import { assertAdminSession } from "@/optimum-geo-intelligence/server/auth"
import { rateLimitGuard, withErrorHandling } from "@/optimum-geo-intelligence/server/security"
import {
  getDashboardSnapshot,
  listAlerts,
  listCompetitorChanges,
} from "@/optimum-geo-intelligence/services/dashboard"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const GET = withErrorHandling(async (request: NextRequest) => {
  const blocked = rateLimitGuard(request, "ogi-dashboard", { max: 80, windowMs: 60_000 })
  if (blocked) return blocked
  await assertAdminSession()

  const [snapshot, alerts, competitors] = await Promise.all([
    getDashboardSnapshot(),
    listAlerts(20),
    listCompetitorChanges(30),
  ])

  return NextResponse.json({
    snapshot,
    alerts,
    competitors,
  })
})
