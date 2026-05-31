import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { LINKPILOT_BACKLINK_STATUSES, LINKPILOT_BACKLINK_TYPES } from "@/lib/linkpilot/constants"
import { assertAdminApiAccess, getAdminSb } from "@/app/api/admin/seo/linkpilot/_shared"

const updateBacklinkSchema = z.object({
  source_url: z.string().url().optional(),
  target_url: z.string().min(1).optional(),
  anchor_text: z.string().nullable().optional(),
  link_type: z.enum(LINKPILOT_BACKLINK_TYPES).optional(),
  status: z.enum(LINKPILOT_BACKLINK_STATUSES).optional(),
  touch_checked_at: z.boolean().optional(),
})

function extractId(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean)
  return parts[parts.length - 1] ?? null
}

export async function PATCH(request: NextRequest) {
  const denied = await assertAdminApiAccess()
  if (denied) return denied
  const sb = getAdminSb()
  const id = extractId(new URL(request.url).pathname)
  if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 })
  const parsed = updateBacklinkSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalide", details: parsed.error.flatten() }, { status: 400 })
  }
  const input = parsed.data

  const payload: Record<string, unknown> = { ...input }
  if (input.touch_checked_at) payload.last_checked_at = new Date().toISOString()
  delete payload.touch_checked_at

  const { data, error } = await sb.from("acquired_backlinks").update(payload).eq("id", id).select("*").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function DELETE(request: NextRequest) {
  const denied = await assertAdminApiAccess()
  if (denied) return denied
  const sb = getAdminSb()
  const id = extractId(new URL(request.url).pathname)
  if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 })
  const { error } = await sb.from("acquired_backlinks").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
