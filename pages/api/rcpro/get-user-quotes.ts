import type { NextApiRequest, NextApiResponse } from "next"
import { getUserRcProQuotes } from "@/src/modules/rcpro/services/rcproService"
import { getCoreApiUserId } from "@/lib/core/auth"
import type { RcProListQuotesResponse, RcProErrorResponse } from "@/src/modules/rcpro/types/rcpro.types"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RcProListQuotesResponse | RcProErrorResponse>
): Promise<void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET")
    res.status(405).json({ error: "Méthode non autorisée" })
    return
  }

  const userId = await getCoreApiUserId(req, res)
  if (!userId) {
    res.status(401).json({ error: "Non authentifié" })
    return
  }

  try {
    const quotes = await getUserRcProQuotes(userId)
    res.status(200).json({ quotes })
    return
  } catch (error) {
    console.error("[api/rcpro/get-user-quotes]", error)
    res.status(500).json({ error: "Impossible de charger les devis RC Pro" })
    return
  }
}
