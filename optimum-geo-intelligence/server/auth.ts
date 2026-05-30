import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"

export async function assertAdminSession() {
  const session = await getServerSession(authOptions)
  if (!session || !isAdmin(session)) {
    throw new Error("Accès administrateur requis")
  }
  return session
}
