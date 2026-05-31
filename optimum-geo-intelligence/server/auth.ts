import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { AppError } from "@/optimum-geo-intelligence/server/security"

export async function assertAdminSession() {
  const session = await getServerSession(authOptions)
  if (!session || !isAdmin(session)) {
    throw new AppError("Accès administrateur requis", 401, "ADMIN_REQUIRED")
  }
  return session
}
