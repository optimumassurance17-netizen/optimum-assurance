import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { assertAdminSession } from "@/optimum-geo-intelligence/server/auth"
import { rateLimitGuard, withErrorHandling } from "@/optimum-geo-intelligence/server/security"
import { runGeoPageBuilder } from "@/optimum-geo-intelligence/services/geo-page-builder"

const schema = z.object({
  maxCities: z.number().int().min(1).max(20).optional(),
  maxProfessions: z.number().int().min(1).max(20).optional(),
})

export const runtime = "nodejs"

export const POST = withErrorHandling(async (request: NextRequest) => {
  const blocked = rateLimitGuard(request, "ogi-pages-build", { max: 10, windowMs: 60_000 })
  if (blocked) return blocked
  await assertAdminSession()
  const body = await request.json().catch(() => ({}))
  const input = schema.parse(body)
  const result = await runGeoPageBuilder(input)
  return NextResponse.json({ ok: true, result })
})
