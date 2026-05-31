import { NextRequest, NextResponse } from "next/server"
import { assertAdminSession } from "@/optimum-geo-intelligence/server/auth"
import { rateLimitGuard, withErrorHandling } from "@/optimum-geo-intelligence/server/security"
import { computeGlobalGeoScore, computeScopedGeoScores } from "@/optimum-geo-intelligence/services/geo-score"

export const runtime = "nodejs"

export const POST = withErrorHandling(async (request: NextRequest) => {
  const blocked = rateLimitGuard(request, "ogi-score-recompute", { max: 10, windowMs: 60_000 })
  if (blocked) return blocked
  await assertAdminSession()
  const [global, scoped] = await Promise.all([computeGlobalGeoScore(), computeScopedGeoScores()])
  return NextResponse.json({ ok: true, global, scoped })
})
