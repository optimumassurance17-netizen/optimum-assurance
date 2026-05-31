import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { assertAdminSession } from "@/optimum-geo-intelligence/server/auth"
import { rateLimitGuard, withErrorHandling } from "@/optimum-geo-intelligence/server/security"
import { scanAndScoreSeoPages } from "@/optimum-geo-intelligence/services/seo-optimizer"

export const runtime = "nodejs"

const schema = z.object({
  autoApply: z.boolean().default(true),
})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const blocked = rateLimitGuard(request, "ogi-seo-scan", { max: 8, windowMs: 60_000 })
  if (blocked) return blocked
  await assertAdminSession()

  const body = await request.json().catch(() => ({}))
  const input = schema.parse(body)
  const result = await scanAndScoreSeoPages({
    autoApply: input.autoApply,
    autoPublishGenerated: input.autoApply,
  })
  return NextResponse.json({ ok: true, result })
})
