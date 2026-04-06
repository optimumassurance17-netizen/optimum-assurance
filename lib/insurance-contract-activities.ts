/**
 * Lecture des activités assurées et exclusions (JSON en base — legacy : tableau de chaînes).
 */

export function parseActivitiesJson(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return []
  try {
    const p = JSON.parse(raw) as unknown
    if (Array.isArray(p)) {
      return p.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    }
  } catch {
    /* ignore */
  }
  return []
}

export function parseExclusionsJson(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return []
  try {
    const p = JSON.parse(raw) as unknown
    if (Array.isArray(p)) {
      return p.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    }
  } catch {
    /* ignore */
  }
  return []
}
