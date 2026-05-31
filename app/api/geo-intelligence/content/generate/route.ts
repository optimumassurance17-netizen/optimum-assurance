import { NextRequest, NextResponse } from "next/server"
import { contentGenerateSchema } from "@/optimum-geo-intelligence/schemas"
import { assertAdminSession } from "@/optimum-geo-intelligence/server/auth"
import { rateLimitGuard, withErrorHandling } from "@/optimum-geo-intelligence/server/security"
import { generateSeoContent } from "@/optimum-geo-intelligence/services/content-generator"

export const runtime = "nodejs"

export const POST = withErrorHandling(async (request: NextRequest) => {
  const blocked = rateLimitGuard(request, "ogi-content-generate", { max: 15, windowMs: 60_000 })
  if (blocked) return blocked
  await assertAdminSession()

  const body = await request.json().catch(() => ({}))
  const input = contentGenerateSchema.parse(body)
  const result = await generateSeoContent(input)
  return NextResponse.json({ ok: true, result })
})
