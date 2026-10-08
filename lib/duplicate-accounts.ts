import { normalizeAccountEmail, normalizeAccountSiret } from "@/lib/client-account-plan"

export type DuplicateAccount = {
  id: string
  email: string
  raisonSociale: string | null
  siret: string | null
  createdAt: Date | string
}

export type DuplicateGroup = {
  id: string
  kind: "email" | "siret"
  key: string
  keepId: string
  members: DuplicateAccount[]
}

function createdAtTime(value: Date | string): number {
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

function sortOldestFirst(members: DuplicateAccount[]): DuplicateAccount[] {
  return [...members].sort(
    (a, b) => createdAtTime(a.createdAt) - createdAtTime(b.createdAt) || a.id.localeCompare(b.id)
  )
}

function sameMemberIds(left: DuplicateAccount[], right: DuplicateAccount[]): boolean {
  if (left.length !== right.length) return false
  const ids = new Set(left.map((member) => member.id))
  return right.every((member) => ids.has(member.id))
}

function pushGroups(
  groups: DuplicateGroup[],
  kind: "email" | "siret",
  buckets: Map<string, DuplicateAccount[]>
): void {
  for (const [key, members] of buckets) {
    if (members.length < 2) continue
    const sorted = sortOldestFirst(members)
    groups.push({
      id: `${kind}:${key}`,
      kind,
      key,
      keepId: sorted[0]?.id ?? "",
      members: sorted,
    })
  }
}

/** Regroupe les comptes déjà créés : même email (casse ignorée) ou même SIRET à 14 chiffres. */
export function buildDuplicateGroups(accounts: DuplicateAccount[]): DuplicateGroup[] {
  const byEmail = new Map<string, DuplicateAccount[]>()
  const bySiret = new Map<string, DuplicateAccount[]>()

  for (const account of accounts) {
    const email = normalizeAccountEmail(account.email)
    if (email) {
      const bucket = byEmail.get(email) ?? []
      bucket.push(account)
      byEmail.set(email, bucket)
    }
    const siret = normalizeAccountSiret(account.siret)
    if (siret) {
      const bucket = bySiret.get(siret) ?? []
      bucket.push(account)
      bySiret.set(siret, bucket)
    }
  }

  const groups: DuplicateGroup[] = []
  pushGroups(groups, "email", byEmail)
  const emailGroups = [...groups]
  for (const [key, members] of bySiret) {
    if (members.length < 2) continue
    if (emailGroups.some((group) => sameMemberIds(group.members, members))) continue
    const sorted = sortOldestFirst(members)
    groups.push({
      id: `siret:${key}`,
      kind: "siret",
      key,
      keepId: sorted[0]?.id ?? "",
      members: sorted,
    })
  }
  return groups
}

export function selectionBelongsToOneGroup(
  groups: DuplicateGroup[],
  keepId: string,
  mergeIds: string[]
): boolean {
  if (!keepId || mergeIds.length === 0) return false
  if (new Set(mergeIds).size !== mergeIds.length) return false
  if (mergeIds.includes(keepId)) return false
  return groups.some((group) => {
    const ids = new Set(group.members.map((member) => member.id))
    return ids.has(keepId) && mergeIds.every((id) => ids.has(id))
  })
}
