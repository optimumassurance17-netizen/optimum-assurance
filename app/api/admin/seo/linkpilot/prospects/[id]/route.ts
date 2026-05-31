import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { LINKPILOT_CATEGORIES, LINKPILOT_STATUSES } from "@/lib/linkpilot/constants"
import { calculateBacklinkScore } from "@/lib/linkpilot/scoring"
import { assertAdminApiAccess, getAdminSb } from "@/app/api/admin/seo/linkpilot/_shared"

const updateSchema = z.object({
  domain: z.string().min(3).optional(),
  url: z.string().url().optional(),
  contact_email: z.string().email().optional().or(z.literal("")),
  contact_name: z.string().nullable().optional(),
  category: z.enum(LINKPILOT_CATEGORIES).optional(),
  niche: z.string().nullable().optional(),
  country: z.string().optional(),
  domain_authority: z.coerce.number().int().min(0).max(100).optional(),
  estimated_traffic: z.coerce.number().int().min(0).optional(),
  spam_score: z.coerce.number().int().min(0).max(100).optional(),
  status: z.enum(LINKPILOT_STATUSES).optional(),
  notes: z.string().nullable().optional(),
  action: z.enum(["mark_contacted", "convert_acquired"]).optional(),
  backlink: z
    .object({
      source_url: z.string().url(),
      target_url: z.string().min(1),
      anchor_text: z.string().optional(),
      link_type: z.enum(["dofollow", "nofollow", "sponsored", "ugc"]).default("dofollow"),
    })
    .optional(),
})

function extractIdFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean)
  return parts[parts.length - 1] ?? null
}

export async function PATCH(request: NextRequest) {
  const denied = await assertAdminApiAccess()
  if (denied) return denied
  const sb = getAdminSb()
  const id = extractIdFromPath(new URL(request.url).pathname)
  if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 })

  const parsed = updateSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalide", details: parsed.error.flatten() }, { status: 400 })
  }
  const input = parsed.data

  const { data: current, error: readError } = await sb
    .from("backlink_prospects")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 })
  if (!current) return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 })

  const domain = (input.domain ?? current.domain).trim().toLowerCase()
  const { data: toxic } = await sb.from("toxic_domains").select("id,domain").eq("domain", domain).maybeSingle()
  if (toxic?.id && toxic.domain !== current.domain) {
    return NextResponse.json({ error: `Domaine bloqué: ${toxic.domain}` }, { status: 409 })
  }

  let nextStatus = input.status ?? current.status
  if (input.action === "mark_contacted") nextStatus = "contacted"
  if (input.action === "convert_acquired") nextStatus = "acquired"

  const category = input.category ?? current.category
  const niche = input.niche ?? current.niche
  const country = input.country ?? current.country
  const domainAuthority = input.domain_authority ?? current.domain_authority
  const estimatedTraffic = input.estimated_traffic ?? current.estimated_traffic
  const spamScore = input.spam_score ?? current.spam_score

  const score = calculateBacklinkScore({
    category,
    niche,
    country,
    domainAuthority,
    estimatedTraffic,
    spamScore,
  })

  const { data, error } = await sb
    .from("backlink_prospects")
    .update({
      domain,
      url: input.url ?? current.url,
      contact_email: input.contact_email === "" ? null : input.contact_email ?? current.contact_email,
      contact_name: input.contact_name ?? current.contact_name,
      category,
      niche,
      country,
      domain_authority: domainAuthority,
      estimated_traffic: estimatedTraffic,
      spam_score: spamScore,
      relevance_score: score.relevance_score,
      backlink_score: score.backlink_score,
      status: nextStatus,
      notes: input.notes ?? current.notes,
    })
    .eq("id", id)
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (input.action === "convert_acquired") {
    const backlinkPayload = input.backlink ?? {
      source_url: current.url,
      target_url: "/assurance-decennale",
      anchor_text: "Optimum Assurance",
      link_type: "dofollow" as const,
    }

    const { error: backlinkError } = await sb.from("acquired_backlinks").insert({
      prospect_id: id,
      source_url: backlinkPayload.source_url,
      target_url: backlinkPayload.target_url,
      anchor_text: backlinkPayload.anchor_text ?? "Optimum Assurance",
      link_type: backlinkPayload.link_type,
      first_seen_at: new Date().toISOString(),
      last_checked_at: new Date().toISOString(),
      status: "active",
    })
    if (backlinkError) {
      return NextResponse.json(
        { error: `Prospect mis à jour mais création backlink échouée: ${backlinkError.message}` },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ item: data, recommendation: score.recommendation })
}

export async function DELETE(request: NextRequest) {
  const denied = await assertAdminApiAccess()
  if (denied) return denied
  const sb = getAdminSb()
  const id = extractIdFromPath(new URL(request.url).pathname)
  if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 })

  const { error } = await sb.from("backlink_prospects").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
