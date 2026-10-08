import type { DevisDommageOuvrageData } from "@/lib/dommage-ouvrage-types"
import {
  buildDoSouscriptionInsurancePayload,
  coutTotalFromDoData,
} from "@/lib/build-do-souscription-payload"
import { prisma } from "@/lib/prisma"
import type { DoSouscriptionInsurancePayload } from "@/lib/types"

function parseQuestionnaire(raw: string | null | undefined): Partial<DevisDommageOuvrageData> | null {
  if (!raw?.trim()) return null
  try {
    const value = JSON.parse(raw) as Partial<DevisDommageOuvrageData>
    return value && typeof value === "object" ? value : null
  } catch {
    return null
  }
}

function payloadFromQuestionnaire(
  data: Partial<DevisDommageOuvrageData>,
  coutTotal: number | null | undefined
): DoSouscriptionInsurancePayload | null {
  const cout = coutTotal && coutTotal > 0 ? coutTotal : coutTotalFromDoData(data)
  return buildDoSouscriptionInsurancePayload(data, cout)
}

/**
 * Reprend la souscription DO depuis la dernière demande (email) ou le questionnaire initial du compte.
 * Aucune colonne nouvelle : les données sont déjà dans le lead et `doInitialQuestionnaireJson`.
 */
export async function loadDoSouscriptionPayloadForUser(
  userId: string,
  email: string
): Promise<DoSouscriptionInsurancePayload | null> {
  const emailNorm = email.trim()
  if (!emailNorm) return null

  const [user, lead] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { doInitialQuestionnaireJson: true },
    }),
    prisma.devisDommageOuvrageLead.findFirst({
      where: { email: { equals: emailNorm, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const leadData = parseQuestionnaire(lead?.data)
  const fromLead = leadData ? payloadFromQuestionnaire(leadData, lead?.coutTotal) : null
  if (fromLead) {
    if (lead?.data && !user?.doInitialQuestionnaireJson?.trim()) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { doInitialQuestionnaireJson: lead.data },
          select: { id: true },
        })
      } catch (error) {
        console.error("[do-souscription] copie demande initiale:", error)
      }
    }
    return fromLead
  }

  const userData = parseQuestionnaire(user?.doInitialQuestionnaireJson)
  if (!userData) return null
  return payloadFromQuestionnaire(userData, null)
}
