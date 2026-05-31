import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { assertAdminApiAccess, getAdminSb } from "@/app/api/admin/seo/linkpilot/_shared"

const createToxicSchema = z.object({
  domain: z.string().min(3),
  reason: z.string().optional(),
  spam_score: z.coerce.number().int().min(0).max(100).default(70),
})

export async function GET() {
  const denied = await assertAdminApiAccess()
  if (denied) return denied
  const sb = getAdminSb()
  const { data, error } = await sb.from("toxic_domains").select("*").order("created_at", { ascending: false }).limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(request: NextRequest) {
  const denied = await assertAdminApiAccess()
  if (denied) return denied
  const sb = getAdminSb()
  const parsed = createToxicSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalide", details: parsed.error.flatten() }, { status: 400 })
  }
  const { data, error } = await sb
    .from("toxic_domains")
    .insert({
      domain: parsed.data.domain.trim().toLowerCase(),
      reason: parsed.data.reason ?? null,
      spam_score: parsed.data.spam_score,
    })
    .select("*")
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data }, { status: 201 })
}
