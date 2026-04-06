import { NextRequest, NextResponse } from "next/server"

/**
 * Sécurise les routes `/api/cron/*` (appelées par Vercel Cron ou un scheduler externe).
 * Définir `CRON_SECRET` (ex. `npm run generate-secret`) et l’envoyer en
 * `Authorization: Bearer <CRON_SECRET>`.
 *
 * - **Production** sans `CRON_SECRET` → 503 (refus explicite).
 * - **Développement** sans secret → autorisé (avec avertissement console).
 */
export function assertCronAuthorized(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET?.trim()
  const isProd = process.env.NODE_ENV === "production"

  if (!secret) {
    if (isProd) {
      return NextResponse.json(
        {
          error:
            "CRON_SECRET non configuré. Définissez cette variable en production pour sécuriser les crons.",
        },
        { status: 503 }
      )
    }
    console.warn(
      "[cron] CRON_SECRET absent — /api/cron accessible sans authentification (uniquement hors production)"
    )
    return null
  }

  const auth = request.headers.get("authorization")?.trim()
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  return null
}
