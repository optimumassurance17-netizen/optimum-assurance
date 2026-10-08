export type AccountForeignKey = {
  childTable: string
  childColumn: string
  parentTable: string
  parentColumn: string
  childNullable: boolean
}

export type AccountPredicate =
  | { kind: "eq"; column: string }
  | {
      kind: "in"
      column: string
      parentTable: string
      parentColumn: string
      parent: AccountPredicate
    }

export type AccountCleanupStep = {
  action: "null" | "delete"
  table: string
  column: string
  where: AccountPredicate
}

export function normalizeAccountEmail(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? ""
}

/** SIRET comparable : 14 chiffres, sans espaces. */
export function normalizeAccountSiret(value: string | null | undefined): string | null {
  const digits = value?.replace(/\D/g, "") ?? ""
  return digits.length === 14 ? digits : null
}

/**
 * Plan de nettoyage avant DELETE du compte.
 * Les lignes obligatoirement liées au client sont supprimées, enfants d'abord.
 * Les liens facultatifs (contrat plateforme, journaux) sont détachés.
 */
export function buildUserCleanupPlan(foreignKeys: AccountForeignKey[]): AccountCleanupStep[] {
  const directToUser = foreignKeys.filter(
    (fk) => fk.parentTable === "User" && fk.parentColumn === "id" && fk.childTable !== "User"
  )
  const deleteTables = new Set(directToUser.filter((fk) => !fk.childNullable).map((fk) => fk.childTable))
  let grew = true
  while (grew) {
    grew = false
    for (const fk of foreignKeys) {
      if (fk.childNullable || fk.parentTable === "User" || fk.childTable === "User") continue
      if (deleteTables.has(fk.parentTable) && !deleteTables.has(fk.childTable)) {
        deleteTables.add(fk.childTable)
        grew = true
      }
    }
  }

  const blockers = new Map<string, Set<string>>()
  for (const table of deleteTables) blockers.set(table, new Set())
  for (const fk of foreignKeys) {
    if (!deleteTables.has(fk.childTable) || !deleteTables.has(fk.parentTable)) continue
    blockers.get(fk.parentTable)?.add(fk.childTable)
  }

  const orderedDeletes: string[] = []
  const pending = new Set(deleteTables)
  while (pending.size > 0) {
    const ready = [...pending].filter((table) => {
      const deps = blockers.get(table)
      return !deps || [...deps].every((dep) => !pending.has(dep))
    })
    if (ready.length === 0) {
      throw new Error("Dépendances de suppression circulaires")
    }
    ready.sort()
    for (const table of ready) {
      orderedDeletes.push(table)
      pending.delete(table)
    }
  }

  const userPredicate = (table: string, seen = new Set<string>()): AccountPredicate | null => {
    if (seen.has(table)) return null
    seen.add(table)
    const direct = directToUser.find((fk) => fk.childTable === table)
    if (direct) return { kind: "eq", column: direct.childColumn }
    const viaParent = foreignKeys.find(
      (fk) => fk.childTable === table && fk.parentTable !== "User" && deleteTables.has(fk.parentTable)
    )
    if (!viaParent) return null
    const parent = userPredicate(viaParent.parentTable, seen)
    if (!parent) return null
    return {
      kind: "in",
      column: viaParent.childColumn,
      parentTable: viaParent.parentTable,
      parentColumn: viaParent.parentColumn,
      parent,
    }
  }

  const steps: AccountCleanupStep[] = []
  for (const fk of directToUser) {
    if (!fk.childNullable || deleteTables.has(fk.childTable)) continue
    steps.push({
      action: "null",
      table: fk.childTable,
      column: fk.childColumn,
      where: { kind: "eq", column: fk.childColumn },
    })
  }
  for (const fk of foreignKeys) {
    if (!fk.childNullable || fk.parentTable === "User") continue
    if (!deleteTables.has(fk.parentTable) || deleteTables.has(fk.childTable)) continue
    const parent = userPredicate(fk.parentTable)
    if (!parent) continue
    steps.push({
      action: "null",
      table: fk.childTable,
      column: fk.childColumn,
      where: {
        kind: "in",
        column: fk.childColumn,
        parentTable: fk.parentTable,
        parentColumn: fk.parentColumn,
        parent,
      },
    })
  }
  for (const table of orderedDeletes) {
    const where = userPredicate(table)
    if (!where) continue
    steps.push({
      action: "delete",
      table,
      column: where.column,
      where,
    })
  }
  return steps
}
