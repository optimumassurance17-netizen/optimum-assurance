type DatedRow = { id: string; createdAt: Date }

/**
 * Parmi les contrats décennale d'un même client, le plus récent reste.
 * `preferredKeepId` force le contrat qui vient d'être créé, même à date égale.
 */
export function decennaleRowsToRemove(rows: DatedRow[], preferredKeepId?: string): string[] {
  if (rows.length <= 1) return []
  const preferred = preferredKeepId && rows.some((row) => row.id === preferredKeepId) ? preferredKeepId : null
  const keepId =
    preferred ??
    [...rows].sort((a, b) => {
      const delta = b.createdAt.getTime() - a.createdAt.getTime()
      if (delta !== 0) return delta
      return b.id.localeCompare(a.id)
    })[0].id
  return rows.filter((row) => row.id !== keepId).map((row) => row.id)
}
