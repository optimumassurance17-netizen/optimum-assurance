import { getClientDevisAutonomyConfig } from "@/lib/client-devis-autonomy"
import {
  DOCUMENT_DEVIS_EDITION_ACTION,
  parseDocumentDevisEditionDecision,
  resolveDocumentDevisEdition,
} from "@/lib/devis-edition"
import { prisma } from "@/lib/prisma"

/** Autorisation de modification de ce devis, avec repli sur l'ancienne règle de fiche. */
export async function getDocumentDevisEdition(input: {
  documentId: string
  userId: string
}): Promise<boolean> {
  const [latest, autonomy] = await Promise.all([
    prisma.adminActivityLog.findFirst({
      where: {
        action: DOCUMENT_DEVIS_EDITION_ACTION,
        targetType: "document",
        targetId: input.documentId,
      },
      orderBy: { createdAt: "desc" },
      select: { details: true },
    }),
    getClientDevisAutonomyConfig(input.userId),
  ])

  return resolveDocumentDevisEdition({
    documentDecision: parseDocumentDevisEditionDecision(latest?.details),
    clientWide: autonomy.allowDevisEdition,
  })
}
