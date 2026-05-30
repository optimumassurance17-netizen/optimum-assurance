import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { LINKPILOT_CATEGORIES, LINKPILOT_STATUSES } from "@/lib/linkpilot/constants"
import { calculateBacklinkScore } from "@/lib/linkpilot/scoring"
import { assertAdminApiAccess, getAdminSb, getQueryParam } from "@/app/api/admin/seo/linkpilot/_shared"

const createProspectSchema = z.object({
  domain: z.string().min(3),
  url: z.string().url(),
  contact_email: z.string().email().optional().or(z.literal("")),
  contact_name: z.string().optional(),
  category: z.enum(LINKPILOT_CATEGORIES).default("autre"),
  niche: z.string().optional(),
  country: z.string().default("France"),
  domain_authority: z.coerce.number().int().min(0).max(100).default(0),
  estimated_traffic: z.coerce.number().int().min(0).default(0),
  spam_score: z.coerce.number().int().min(0).max(100).default(0),
  status: z.enum(LINKPILOT_STATUSES).default("new"),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const denied = await assertAdminApiAccess()
  if (denied) return denied
  const sb = getAdminSb()

  const search = getQueryParam(request, "search")
  const status = getQueryParam(request, "status")
  const category = getQueryParam(request, "category")

  let query = sb
    .from("backlink_prospects")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200)

  if (search) query = query.or(`domain.ilike.%${search}%,url.ilike.%${search}%`)
  if (status) query = query.eq("status", status)
  if (category) query = query.eq("category", category)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(request: NextRequest) {
  const denied = await assertAdminApiAccess()
  if (denied) return denied
  const sb = getAdminSb()

  const parsed = createProspectSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalide", details: parsed.error.flatten() }, { status: 400 })
  }

  const input = parsed.data
  const normalizedDomain = input.domain.trim().toLowerCase()
  const { data: toxic } = await sb
    .from("toxic_domains")
    .select("id,domain")
    .eq("domain", normalizedDomain)
    .maybeSingle()
  if (toxic?.id) {
    return NextResponse.json(
      { error: `Domaine bloqué: ${toxic.domain}. Prospect refusé car listé toxique.` },
      { status: 409 }
    )
  }

  const score = calculateBacklinkScore({
    category: input.category,
    niche: input.niche,
    country: input.country,
    domainAuthority: input.domain_authority,
    estimatedTraffic: input.estimated_traffic,
    spamScore: input.spam_score,
  })

  const { data, error } = await sb
    .from("backlink_prospects")
    .insert({
      ...input,
      domain: normalizedDomain,
      contact_email: input.contact_email || null,
      relevance_score: score.relevance_score,
      backlink_score: score.backlink_score,
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data }, { status: 201 })
}
