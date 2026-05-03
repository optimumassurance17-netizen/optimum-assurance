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
    // Exclure API / SEO statique / assets : le proxy ne doit jamais bloquer les routes serveur.
    "/((?!api/|sitemap\\.xml$|robots\\.txt$|manifest\\.webmanifest$|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
