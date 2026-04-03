import { prisma } from "@/lib/prisma"

/** Champs identité alignés entre `User` et le JSON contrat / avenant */
export const IDENTITY_DOC_KEYS = [
  "raisonSociale",
  "email",
  "siret",
  "adresse",
  "codePostal",
  "ville",
  "telephone",
] as const

export type IdentityDocKey = (typeof IDENTITY_DOC_KEYS)[number]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function strFromData(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === "" ? null : s
}

/**
 * Après mise à jour du JSON d'un contrat ou avenant : aligne la fiche `User` liée.
 */
export async function syncUserFromDocumentMergedData(
  userId: string,
  mergedData: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const update: {
    raisonSociale?: string | null
    email?: string
    siret?: string | null
    adresse?: string | null
    codePostal?: string | null
    ville?: string | null
    telephone?: string | null
  } = {}

  for (const key of IDENTITY_DOC_KEYS) {
    if (!(key in mergedData)) continue
    const raw = mergedData[key]
    if (key === "email") {
      const s = strFromData(raw)
      if (s === null) {
        return { ok: false, error: "L'email dans le contrat ne peut pas être vide pour synchroniser la fiche", status: 400 }
      }
      const lower = s.toLowerCase()
      if (!EMAIL_RE.test(lower)) {
        return { ok: false, error: "Email invalide dans les données contrat", status: 400 }
      }
      update.email = lower
    } else {
      update[key] = strFromData(raw)
    }
  }

  if (Object.keys(update).length === 0) {
    return { ok: true }
  }

  const current = await prisma.user.findUnique({ where: { id: userId } })
  if (!current) {
    return { ok: false, error: "Utilisateur introuvable", status: 404 }
  }

  if (update.email !== undefined && update.email !== current.email) {
    const taken = await prisma.user.findUnique({ where: { email: update.email }, select: { id: true } })
    if (taken && taken.id !== userId) {
      return { ok: false, error: "Cet email est déjà utilisé par un autre compte (synchronisation impossible)", status: 409 }
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: update,
  })

  return { ok: true }
}

/**
 * Après mise à jour de la fiche `User` : recopie l'identité dans tous les JSON contrat / avenant du client.
 */
export async function syncContratAvenantDocumentsFromUser(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      raisonSociale: true,
      siret: true,
      adresse: true,
      codePostal: true,
      ville: true,
      telephone: true,
    },
  })
  if (!user) return 0

  const docs = await prisma.document.findMany({
    where: { userId, type: { in: ["contrat", "avenant"] } },
    select: { id: true, data: true },
  })

  let n = 0
  for (const doc of docs) {
    let parsed: Record<string, unknown> = {}
    try {
      parsed = JSON.parse(doc.data || "{}") as Record<string, unknown>
    } catch {
      continue
    }
    parsed.raisonSociale = user.raisonSociale ?? null
    parsed.email = user.email
    parsed.siret = user.siret ?? null
    parsed.adresse = user.adresse ?? null
    parsed.codePostal = user.codePostal ?? null
    parsed.ville = user.ville ?? null
    parsed.telephone = user.telephone ?? null

    await prisma.document.update({
      where: { id: doc.id },
      data: { data: JSON.stringify(parsed) },
    })
    n++
  }

  return n
}
