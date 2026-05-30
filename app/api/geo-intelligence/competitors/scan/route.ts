import { NextRequest, NextResponse } from "next/server"
import { competitorScanSchema } from "@/optimum-geo-intelligence/schemas"
import { assertAdminSession } from "@/optimum-geo-intelligence/server/auth"
import { rateLimitGuard, withErrorHandling } from "@/optimum-geo-intelligence/server/security"
import { runCompetitorTracker } from "@/optimum-geo-intelligence/services/competitor-tracker"

export const runtime = "nodejs"

export const POST = withErrorHandling(async (request: NextRequest) => {
  const blocked = rateLimitGuard(request, "ogi-competitors-scan", { max: 20, windowMs: 60_000 })
  if (blocked) return blocked
  await assertAdminSession()

  const body = await request.json().catch(() => ({}))
  const input = competitorScanSchema.parse(body)
  const result = await runCompetitorTracker(input)
  return NextResponse.json({ ok: true, result })
})
