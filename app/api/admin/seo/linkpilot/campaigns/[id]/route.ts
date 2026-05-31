import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { LINKPILOT_CAMPAIGN_STATUSES } from "@/lib/linkpilot/constants"
import { assertAdminApiAccess, getAdminSb } from "@/app/api/admin/seo/linkpilot/_shared"

const updateCampaignSchema = z.object({
  name: z.string().min(3).optional(),
  target_category: z.string().nullable().optional(),
  email_subject: z.string().nullable().optional(),
  email_body: z.string().nullable().optional(),
  status: z.enum(LINKPILOT_CAMPAIGN_STATUSES).optional(),
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

  const parsed = updateCampaignSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalide", details: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await sb
    .from("outreach_campaigns")
    .update(parsed.data)
    .eq("id", id)
    .select("*")
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function DELETE(request: NextRequest) {
  const denied = await assertAdminApiAccess()
  if (denied) return denied
  const sb = getAdminSb()
  const id = extractId(new URL(request.url).pathname)
  if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 })

  const { error } = await sb.from("outreach_campaigns").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
