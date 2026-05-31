import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { LINKPILOT_CAMPAIGN_STATUSES } from "@/lib/linkpilot/constants"
import { assertAdminApiAccess, getAdminSb } from "@/app/api/admin/seo/linkpilot/_shared"

const createCampaignSchema = z.object({
  name: z.string().min(3),
  target_category: z.string().optional(),
  email_subject: z.string().optional(),
  email_body: z.string().optional(),
  status: z.enum(LINKPILOT_CAMPAIGN_STATUSES).default("draft"),
})

export async function GET() {
  const denied = await assertAdminApiAccess()
  if (denied) return denied
  const sb = getAdminSb()
  const { data, error } = await sb
    .from("outreach_campaigns")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(150)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(request: NextRequest) {
  const denied = await assertAdminApiAccess()
  if (denied) return denied
  const sb = getAdminSb()
  const parsed = createCampaignSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalide", details: parsed.error.flatten() }, { status: 400 })
  }
  const { data, error } = await sb.from("outreach_campaigns").insert(parsed.data).select("*").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data }, { status: 201 })
}
