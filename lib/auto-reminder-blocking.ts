import { prisma } from "@/lib/prisma"

export const AUTO_REMINDER_BLOCK_ACTION = "auto_reminder_blocked"

export const AUTO_REMINDER_BLOCK_TARGET_TYPES = [
  "pending_signature",
  "insurance_contract",
  "devis_lead",
] as const

export type AutoReminderBlockTargetType = (typeof AUTO_REMINDER_BLOCK_TARGET_TYPES)[number]

function normalizeTargetId(value: string): string {
  return value.trim().slice(0, 191)
}

export function isAutoReminderBlockTargetType(value: string): value is AutoReminderBlockTargetType {
  return (AUTO_REMINDER_BLOCK_TARGET_TYPES as readonly string[]).includes(value)
}

export function parseDashboardActionAutoReminderTarget(actionId: string): {
  targetType: AutoReminderBlockTargetType
  targetId: string
} | null {
  const normalizedActionId = actionId.trim()
  if (!normalizedActionId) return null

  const mappings = [
    { prefix: "sig-", targetType: "pending_signature" as const },
    { prefix: "ctr-", targetType: "insurance_contract" as const },
    { prefix: "lead-dec-", targetType: "devis_lead" as const },
  ]

  for (const mapping of mappings) {
    if (!normalizedActionId.startsWith(mapping.prefix)) continue
    const targetId = normalizeTargetId(normalizedActionId.slice(mapping.prefix.length))
    if (!targetId) return null
    return { targetType: mapping.targetType, targetId }
  }

  return null
}

export async function getAutoReminderBlockedTargetIds(
  targetType: AutoReminderBlockTargetType,
  targetIds: string[]
): Promise<Set<string>> {
  const normalizedTargetIds = [...new Set(targetIds.map((targetId) => normalizeTargetId(targetId)).filter(Boolean))]
  if (normalizedTargetIds.length === 0) return new Set<string>()

  const rows = await prisma.adminActivityLog.findMany({
    where: {
      action: AUTO_REMINDER_BLOCK_ACTION,
      targetType,
      targetId: { in: normalizedTargetIds },
    },
    select: { targetId: true },
  })

  return new Set(rows.map((row) => normalizeTargetId(row.targetId ?? "")).filter(Boolean))
}

export async function blockAutoReminder(params: {
  adminEmail: string
  targetType: AutoReminderBlockTargetType
  targetId: string
  details?: Record<string, unknown>
}): Promise<"created" | "already"> {
  const targetId = normalizeTargetId(params.targetId)
  if (!targetId) {
    throw new Error("targetId invalide")
  }

  const existing = await prisma.adminActivityLog.findFirst({
    where: {
      action: AUTO_REMINDER_BLOCK_ACTION,
      targetType: params.targetType,
      targetId,
    },
    select: { id: true },
  })

  if (existing) return "already"

  await prisma.adminActivityLog.create({
    data: {
      adminEmail: params.adminEmail,
      action: AUTO_REMINDER_BLOCK_ACTION,
      targetType: params.targetType,
      targetId,
      details:
        params.details && Object.keys(params.details).length > 0
          ? JSON.stringify(params.details)
          : null,
    },
  })

  return "created"
}
