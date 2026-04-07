import type { NextApiRequest, NextApiResponse } from "next"
import { createRcProQuote } from "@/src/modules/rcpro/services/rcproService"
import { validateRcProCalculateInput } from "@/src/modules/rcpro/lib/rcproValidation"
import { computeRcProPrice } from "@/src/modules/rcpro/lib/rcproEngine"
import { getCoreApiUserId } from "@/lib/core/auth"
import { getCoreRcProLegalMentions } from "@/lib/core/pdf"
import type { RcProCreateQuoteResponse, RcProErrorResponse, RcProInput } from "@/src/modules/rcpro/types/rcpro.types"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RcProCreateQuoteResponse | RcProErrorResponse>
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    res.status(405).json({ error: "Méthode non autorisée." })
    return
  }

  const userId = await getCoreApiUserId(req, res)
  if (!userId) {
    res.status(401).json({ error: "Non authentifié." })
    return
  }

  const parsed = validateRcProCalculateInput(req.body as Partial<RcProInput>)
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error })
    return
  }

  try {
    const price = computeRcProPrice(parsed.value).price
    const { legalNotes, legalLinks } = getCoreRcProLegalMentions()
    const quote = await createRcProQuote({
      user_id: userId,
      activity: parsed.value.activity,
      revenue: parsed.value.revenue,
      employees: parsed.value.employees,
      riskLevel: parsed.value.riskLevel,
      legalNotes,
      legalLinks,
      options: parsed.value.options,
      price,
      status: "draft",
    })
    res.status(200).json({ quote })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur."
    res.status(500).json({ error: message })
  }
}
