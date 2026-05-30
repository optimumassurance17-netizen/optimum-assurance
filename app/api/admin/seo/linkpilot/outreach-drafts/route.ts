import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { assertAdminApiAccess, getAdminSb } from "@/app/api/admin/seo/linkpilot/_shared"

const createDraftSchema = z.object({
  prospect_id: z.string().uuid(),
  campaign_id: z.string().uuid().optional(),
  recipient_email: z.string().email(),
  subject: z.string().min(5),
  body: z.string().min(20),
  status: z.enum(["draft", "ready_for_review", "approved"]).default("draft"),
})

export async function GET() {
  const denied = await assertAdminApiAccess()
  if (denied) return denied
  const sb = getAdminSb()
  const { data, error } = await sb
    .from("sent_outreach_emails")
    .select("*, backlink_prospects(domain,url), outreach_campaigns(name,status)")
    .order("created_at", { ascending: false })
    .limit(150)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(request: NextRequest) {
  const denied = await assertAdminApiAccess()
  if (denied) return denied
  const sb = getAdminSb()
  const parsed = createDraftSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalide", details: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await sb
    .from("sent_outreach_emails")
    .insert({
      prospect_id: parsed.data.prospect_id,
      campaign_id: parsed.data.campaign_id ?? null,
      recipient_email: parsed.data.recipient_email,
      subject: parsed.data.subject,
      body: parsed.data.body,
      status: parsed.data.status,
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data }, { status: 201 })
}
