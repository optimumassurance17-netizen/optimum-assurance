import { NextRequest, NextResponse } from "next/server"
import { assertAdminSession } from "@/optimum-geo-intelligence/server/auth"
import { rateLimitGuard, withErrorHandling } from "@/optimum-geo-intelligence/server/security"
import { scanAndScoreSeoPages } from "@/optimum-geo-intelligence/services/seo-optimizer"

export const runtime = "nodejs"

export const POST = withErrorHandling(async (request: NextRequest) => {
  const blocked = rateLimitGuard(request, "ogi-seo-scan", { max: 8, windowMs: 60_000 })
  if (blocked) return blocked
  await assertAdminSession()

  const result = await scanAndScoreSeoPages()
  return NextResponse.json({ ok: true, result })
})
