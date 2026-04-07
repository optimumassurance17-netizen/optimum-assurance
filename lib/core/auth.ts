import type { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function getCoreApiUserId(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<string | null> {
  const session = await getServerSession(req, res, authOptions)
  return session?.user?.id ?? null
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
