import { type NextRequest } from "next/server"
import { updateSession } from "@/utils/supabase/middleware"

/**
 * Next.js 16 : convention `proxy` (remplace `middleware`).
 * Rafraîchit la session Supabase Auth (cookies).
 */
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    // Exclure sitemap / robots / manifest : pas besoin de session ; évite un 500 si getUser() échoue.
    "/((?!sitemap\\.xml$|robots\\.txt$|manifest\\.webmanifest$|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
