export type ConversionEvent =
  | "devis_started"
  | "devis_completed"
  | "do_devis_started"
  | "do_devis_completed"
  | "souscription_started"
  | "souscription_completed"
  | "account_created"
  | "signature_started"
  | "signature_completed"
  | "mandat_sepa_started"
  | "mandat_sepa_completed"
  | "payment_started"
  | "payment_redirected"

type TrackOptions = {
  product?: "decennale" | "do" | "rc_fabriquant"
  source?: string
  metadata?: Record<string, string | number | boolean | null | undefined>
}

export type ConversionTrackingContext = {
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  entryPath?: string
  referrer?: string
}

const VISITOR_KEY = "optimum_conversion_visitor_id"

function visitorId(): string | undefined {
  if (typeof window === "undefined") return undefined
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY)
    if (existing) return existing
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    window.localStorage.setItem(VISITOR_KEY, id)
    return id
  } catch {
    return undefined
  }
}

export function trackConversion(event: ConversionEvent, opts: TrackOptions = {}): void {
  if (typeof window === "undefined") return
  const payload = JSON.stringify({
    event,
    visitorId: visitorId(),
    path: `${window.location.pathname}${window.location.search}`,
    product: opts.product,
    source: opts.source,
    metadata: opts.metadata ?? {},
  })

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" })
      if (navigator.sendBeacon("/api/conversion/track", blob)) return
    }
  } catch {
    // fallback fetch
  }

  void fetch("/api/conversion/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => undefined)
}

function normalize(value?: string | null): string | undefined {
  const cleaned = value?.trim()
  return cleaned ? cleaned : undefined
}

export function buildTrackedHref(
  href: string,
  tracking: Omit<ConversionTrackingContext, "referrer">
): string {
  const params = new URLSearchParams()

  if (tracking.utmSource) params.set("utm_source", tracking.utmSource)
  if (tracking.utmMedium) params.set("utm_medium", tracking.utmMedium)
  if (tracking.utmCampaign) params.set("utm_campaign", tracking.utmCampaign)
  if (tracking.entryPath) params.set("entry_path", tracking.entryPath)

  const query = params.toString()
  if (!query) return href

  return `${href}${href.includes("?") ? "&" : "?"}${query}`
}

export function readConversionTrackingContext(
  params: URLSearchParams,
  referrer?: string
): ConversionTrackingContext {
  return {
    utmSource: normalize(params.get("utm_source")),
    utmMedium: normalize(params.get("utm_medium")),
    utmCampaign: normalize(params.get("utm_campaign")),
    entryPath: normalize(params.get("entry_path")),
    referrer: normalize(referrer),
  }
}

export function hasConversionTrackingContext(
  tracking?: ConversionTrackingContext | null
): boolean {
  return Boolean(
    tracking?.utmSource ||
      tracking?.utmMedium ||
      tracking?.utmCampaign ||
      tracking?.entryPath ||
      tracking?.referrer
  )
}

export function buildConversionTrackingLines(
  tracking?: ConversionTrackingContext | null
): string[] {
  if (!tracking) return []

  const lines: string[] = []

  if (tracking.entryPath) lines.push(`Page d'entrée : ${tracking.entryPath}`)
  if (tracking.utmSource) lines.push(`UTM source : ${tracking.utmSource}`)
  if (tracking.utmMedium) lines.push(`UTM medium : ${tracking.utmMedium}`)
  if (tracking.utmCampaign) lines.push(`UTM campaign : ${tracking.utmCampaign}`)
  if (tracking.referrer) lines.push(`Referrer : ${tracking.referrer}`)

  return lines
}
