import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSireneEnvStatus } from "@/lib/sirene"

/** Toujours à jour (monitoring / Vercel), pas de cache edge statique. */
export const dynamic = "force-dynamic"

function resendConfigured(): boolean {
  const k = process.env.RESEND_API_KEY
  return Boolean(k && k.trim().length > 0)
}

function emailFromConfigured(): boolean {
  const f = process.env.EMAIL_FROM
  return Boolean(f && f.trim().length > 0)
}

function cronSecretConfigured(): boolean {
  const s = process.env.CRON_SECRET
  return Boolean(s && s.trim().length > 0)
}

const CRON_ROUTES = [
  "/api/cron/rappels-renouvellement",
  "/api/cron/rappel-devis-abandonne",
  "/api/cron/rappel-signatures-en-attente",
  "/api/cron/rappel-paiements-contrats",
  "/api/cron/sepa-trimestriel",
] as const

/** Variables nécessaires à Supabase Sign (upload PDF, /api/sign) — pas d’appel réseau. */
function esignEnv() {
  const supabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim())
  const serviceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())
  return {
    supabaseUrl: supabaseUrl ? ("configured" as const) : ("missing" as const),
    serviceRole: serviceRole ? ("configured" as const) : ("missing" as const),
    ready: supabaseUrl && serviceRole,
  }
}

/**
 * Health check pour monitoring (UptimeRobot, Vercel, etc.)
 * GET /api/health
 * Ne teste pas l’API Resend (pas d’email envoyé) — indique seulement si les variables sont présentes.
 * Les crons `/api/cron/*` refusent les appels en prod sans `CRON_SECRET` (503) ; Vercel envoie `Authorization: Bearer …` si la variable est définie.
 * `esign` : présence de NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (signature électronique).
 * `sirene` : clés INSEE et/ou Pappers pour `/api/siret` (préremplissage SIRET) — pas d’appel API ici.
 */
export async function GET() {
  const crons = {
    secret: cronSecretConfigured() ? "configured" : "missing",
    routes: CRON_ROUTES,
    count: CRON_ROUTES.length,
  }
  const esign = esignEnv()
  const sirene = getSireneEnvStatus()
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "connected",
      email: {
        resend: resendConfigured() ? "configured" : "missing",
        from: emailFromConfigured() ? "configured" : "missing",
      },
      crons,
      esign,
      sirene,
    })
  } catch (error) {
    console.error("Health check failed:", error)
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        email: {
          resend: resendConfigured() ? "configured" : "missing",
          from: emailFromConfigured() ? "configured" : "missing",
        },
        crons,
        esign,
        sirene,
      },
      { status: 503 }
    )
  }
}
