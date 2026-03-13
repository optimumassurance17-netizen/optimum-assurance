import type { Session } from "next-auth"

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export function isAdmin(session: Session | null): boolean {
  if (!session?.user?.email) return false
  return ADMIN_EMAILS.includes(session.user.email.toLowerCase())
}
