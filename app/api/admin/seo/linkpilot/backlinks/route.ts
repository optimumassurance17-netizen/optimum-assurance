import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { LINKPILOT_BACKLINK_STATUSES, LINKPILOT_BACKLINK_TYPES } from "@/lib/linkpilot/constants"
import { assertAdminApiAccess, getAdminSb } from "@/app/api/admin/seo/linkpilot/_shared"

const createBacklinkSchema = z.object({
  prospect_id: z.string().uuid().optional(),
  source_url: z.string().url(),
  target_url: z.string().min(1),
  anchor_text: z.string().optional(),
  link_type: z.enum(LINKPILOT_BACKLINK_TYPES).default("dofollow"),
  status: z.enum(LINKPILOT_BACKLINK_STATUSES).default("active"),
})

export async function GET() {
  const denied = await assertAdminApiAccess()
  if (denied) return denied
  const sb = getAdminSb()
  const { data, error } = await sb
    .from("acquired_backlinks")
    .select("*, backlink_prospects(domain,url)")
    .order("created_at", { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(request: NextRequest) {
  const denied = await assertAdminApiAccess()
  if (denied) return denied
  const sb = getAdminSb()
  const parsed = createBacklinkSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalide", details: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await sb
    .from("acquired_backlinks")
    .insert({
      ...parsed.data,
      first_seen_at: new Date().toISOString(),
      last_checked_at: new Date().toISOString(),
    })
    .select("*")
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data }, { status: 201 })
}
