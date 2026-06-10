import type { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth"
import { getToken } from "next-auth/jwt"
import { authOptions } from "@/lib/auth"

export async function getCoreApiUserId(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<string | null> {
  // Les endpoints RC Pro vivent encore sous pages/api. En prod, la lecture de
  // session via getServerSession(req, res, authOptions) peut échouer avec un
  // routeur App Router + session JWT. On lit d'abord le JWT directement pour
  // renvoyer un 401 propre sans transformer l'absence de session en 500.
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    })
    if (typeof token?.id === "string" && token.id.trim()) {
      return token.id
    }
  } catch {
    // Fallback silencieux vers getServerSession ci-dessous.
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    return session?.user?.id ?? null
  } catch {
    return null
  }
}

export async function requireCoreApiUserId(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<string> {
  const userId = await getCoreApiUserId(req, res)
  if (!userId) {
    throw new Error("UNAUTHENTICATED")
  }
  return userId
}
