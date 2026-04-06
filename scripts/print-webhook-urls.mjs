#!/usr/bin/env node
/**
 * Affiche les URLs à configurer manuellement dans Mollie.
 * Usage: npm run print:webhooks
 *        VERIFY_PROD_URL=https://www.x.fr node scripts/print-webhook-urls.mjs
 */
const base = (process.env.VERIFY_PROD_URL || process.argv[2] || "https://www.optimum-assurance.fr").replace(
  /\/$/,
  ""
)

console.log(`
📌 URLs à reporter dans les dashboards (remplacez le domaine si besoin)

Base production : ${base}

Mollie (développeurs → Webhooks ou dans l’app) :
  ${base}/api/mollie/webhook

Retour utilisateur après signature (décennale) :
  ${base}/signature/callback

Crons Vercel (déjà dans vercel.json) — protéger avec CRON_SECRET :
  ${base}/api/cron/rappels-renouvellement
  ${base}/api/cron/rappel-devis-abandonne
  ${base}/api/cron/sepa-trimestriel

Health check (monitoring) :
  ${base}/api/health
`)
