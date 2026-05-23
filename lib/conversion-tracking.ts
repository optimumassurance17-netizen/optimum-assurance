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
