import type { NextApiRequest, NextApiResponse } from "next"
import { getUserRcProQuoteById } from "@/src/modules/rcpro/services/rcproService"
import { getCoreApiUserId } from "@/lib/core/auth"
import type { RcProErrorResponse, RcProGetQuoteResponse } from "@/src/modules/rcpro/types/rcpro.types"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RcProGetQuoteResponse | RcProErrorResponse>
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

  const quoteIdRaw = typeof req.query.id === "string" ? req.query.id : ""
  const quoteId = quoteIdRaw.trim()
  if (!quoteId) {
    res.status(400).json({ error: "Paramètre id requis" })
    return
  }

  try {
    const quote = await getUserRcProQuoteById(userId, quoteId)
    if (!quote) {
      res.status(404).json({ error: "Devis introuvable" })
      return
    }
    res.status(200).json({ quote })
  } catch (error) {
    console.error("[api/rcpro/get-quote-by-id]", error)
    res.status(500).json({ error: "Erreur serveur" })
    return
  }
}
