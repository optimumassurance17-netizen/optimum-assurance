import { prisma } from "@/lib/prisma"

export type UserDocumentReviewStatus = "valid" | "invalid"

export type UserDocumentReview = {
  status: UserDocumentReviewStatus
  reason: string | null
  updatedAt: string
}

export const USER_DOCUMENT_REVIEW_ACTION = "user_document_validation_set"

function parseReviewDetails(raw: string | null): {
  status: UserDocumentReviewStatus
  reason: string | null
} | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { status?: unknown; reason?: unknown }
    if (parsed.status !== "valid" && parsed.status !== "invalid") return null
    const reason =
      typeof parsed.reason === "string" && parsed.reason.trim().length > 0
        ? parsed.reason.trim()
        : null
    return { status: parsed.status, reason }
  } catch {
    return null
  }
}

/**
 * Retourne la dernière validation admin connue pour chaque UserDocument.
 */
export async function fetchUserDocumentReviews(
  documentIds: string[]
): Promise<Record<string, UserDocumentReview>> {
  const ids = documentIds.map((id) => id.trim()).filter(Boolean)
  if (ids.length === 0) return {}

  const logs = await prisma.adminActivityLog.findMany({
    where: {
      action: USER_DOCUMENT_REVIEW_ACTION,
      targetType: "user_document",
      targetId: { in: ids },
    },
    select: {
      targetId: true,
      details: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  const reviews: Record<string, UserDocumentReview> = {}
  for (const log of logs) {
    const docId = log.targetId?.trim()
    if (!docId || reviews[docId]) continue
    const parsed = parseReviewDetails(log.details)
    if (!parsed) continue
    reviews[docId] = {
      status: parsed.status,
      reason: parsed.reason,
      updatedAt: log.createdAt.toISOString(),
    }
  }
  return reviews
}
