import type { NextApiRequest, NextApiResponse } from "next"
import { computeRcProPrice } from "@/src/modules/rcpro/lib/rcproEngine"
import { validateRcProCalculateInput } from "@/src/modules/rcpro/lib/rcproValidation"

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ price: number } | { error: string }>
): void {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    res.status(405).json({ error: "Méthode non autorisée." })
    return
  }

  const parsed = validateRcProCalculateInput(req.body)
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error })
    return
  }

  const breakdown = computeRcProPrice(parsed.value)
  res.status(200).json({ price: breakdown.price })
}
