import "server-only"
import { prisma } from "@/lib/prisma"

export const CLIENT_DEVIS_AUTONOMY_ACTION = "client_devis_autonomy_updated"

export type ClientDevisAutonomyConfig = {
  allowDevisEdition: boolean
  allowForcedActivities: boolean
  forcedActivities: string[]
  note: string | null
  updatedAt: string | null
  updatedBy: string | null
}

function normalizeBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value !== 0
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (["1", "true", "oui", "yes", "on"].includes(normalized)) return true
    if (["0", "false", "non", "no", "off"].includes(normalized)) return false
  }
  return fallback
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function normalizeForcedActivitiesInput(value: unknown): string[] {
  const fromArray = Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .flatMap((item) => item.split(/[,\n;]/))
    : typeof value === "string"
      ? value.split(/[,\n;]/)
      : []

  const unique = new Set<string>()
  for (const raw of fromArray) {
    const normalized = raw.trim()
    if (!normalized) continue
    unique.add(normalized)
  }
  return [...unique]
}

function parseDetails(raw: string | null | undefined): Record<string, unknown> {
  if (!raw?.trim()) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    return parsed as Record<string, unknown>
  } catch {
    return {}
  }
}

export function parseClientDevisAutonomyConfigFromDetails(details: Record<string, unknown>): {
  allowDevisEdition: boolean
  allowForcedActivities: boolean
  forcedActivities: string[]
  note: string | null
} {
  const forcedActivities = normalizeForcedActivitiesInput(details.forcedActivities)
  const allowDevisEdition = normalizeBoolean(
    details.allowDevisEdition ?? details.enabled,
    false
  )
  const allowForcedActivities = normalizeBoolean(
    details.allowForcedActivities,
    forcedActivities.length > 0
  )

  return {
    allowDevisEdition,
    allowForcedActivities,
    forcedActivities: allowForcedActivities ? forcedActivities : [],
    note: normalizeString(details.note),
  }
}

export async function getClientDevisAutonomyConfig(
  userId: string
): Promise<ClientDevisAutonomyConfig> {
  const latest = await prisma.adminActivityLog.findFirst({
    where: {
      action: CLIENT_DEVIS_AUTONOMY_ACTION,
      targetType: "user",
      targetId: userId,
    },
    orderBy: { createdAt: "desc" },
    select: {
      adminEmail: true,
      details: true,
      createdAt: true,
    },
  })

  if (!latest) {
    return {
      allowDevisEdition: false,
      allowForcedActivities: false,
      forcedActivities: [],
      note: null,
      updatedAt: null,
      updatedBy: null,
    }
  }

  const details = parseDetails(latest.details)
  const parsed = parseClientDevisAutonomyConfigFromDetails(details)
  return {
    ...parsed,
    updatedAt: latest.createdAt.toISOString(),
    updatedBy: latest.adminEmail,
  }
}
