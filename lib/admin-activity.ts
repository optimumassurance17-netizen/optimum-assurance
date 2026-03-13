import { prisma } from "./prisma"

export async function logAdminActivity(params: {
  adminEmail: string
  action: string
  targetType?: string
  targetId?: string
  details?: Record<string, unknown>
}) {
  try {
    await prisma.adminActivityLog.create({
      data: {
        adminEmail: params.adminEmail,
        action: params.action,
        targetType: params.targetType ?? null,
        targetId: params.targetId ?? null,
        details: params.details ? JSON.stringify(params.details) : null,
      },
    })
  } catch (e) {
    console.error("Erreur log admin:", e)
  }
}
