import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { assertAdminSession } from "@/optimum-geo-intelligence/server/auth"
import { rateLimitGuard, withErrorHandling } from "@/optimum-geo-intelligence/server/security"
import { validateSeoRecommendation } from "@/optimum-geo-intelligence/services/seo-optimizer"

const schema = z.object({
  path: z.string().min(1),
  approve: z.boolean(),
})

export const runtime = "nodejs"

export const POST = withErrorHandling(async (request: NextRequest) => {
  const blocked = rateLimitGuard(request, "ogi-seo-validate", { max: 20, windowMs: 60_000 })
  if (blocked) return blocked
  await assertAdminSession()
  const input = schema.parse(await request.json())
  const result = await validateSeoRecommendation(input.path, input.approve)
  return NextResponse.json({ ok: true, result })
})
