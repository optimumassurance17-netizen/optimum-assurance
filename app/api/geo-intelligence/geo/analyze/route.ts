import { NextRequest, NextResponse } from "next/server"
import { geoAnalyzeSchema } from "@/optimum-geo-intelligence/schemas"
import { assertAdminSession } from "@/optimum-geo-intelligence/server/auth"
import { rateLimitGuard, withErrorHandling } from "@/optimum-geo-intelligence/server/security"
import { runGeoVisibilityAnalysis } from "@/optimum-geo-intelligence/services/geo-visibility"

export const runtime = "nodejs"

export const POST = withErrorHandling(async (request: NextRequest) => {
  const blocked = rateLimitGuard(request, "ogi-geo-analyze", { max: 25, windowMs: 60_000 })
  if (blocked) return blocked
  await assertAdminSession()

  const body = await request.json().catch(() => ({}))
  const input = geoAnalyzeSchema.parse(body)
  const result = await runGeoVisibilityAnalysis(input)
  return NextResponse.json({ ok: true, result })
})
