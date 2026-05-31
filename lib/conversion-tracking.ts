export type ConversionTrackingContext = {
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  entryPath?: string
  referrer?: string
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
