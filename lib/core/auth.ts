import type { NextApiRequest, NextApiResponse } from "next"
import { getToken } from "next-auth/jwt"

export async function getCoreApiUserId(req: NextApiRequest): Promise<string | null> {
  // Les endpoints RC Pro vivent sous pages/api et ne doivent pas dépendre de
  // lib/auth, car ce module importe Prisma via `server-only`, incompatible ici.
  // La session NextAuth est en stratégie JWT : lire le token suffit pour
  // distinguer proprement utilisateur connecté vs. anonyme.
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    })
    if (typeof token?.id === "string" && token.id.trim()) {
      return token.id
    }
    return null
  } catch {
    return null
  }
}

export async function requireCoreApiUserId(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<string> {
  const userId = await getCoreApiUserId(req)
  if (!userId) {
    throw new Error("UNAUTHENTICATED")
  }
  return userId
}
