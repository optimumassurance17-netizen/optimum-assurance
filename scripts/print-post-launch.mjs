#!/usr/bin/env node
/**
 * Rappel des URLs utiles après mise en ligne (SEO, monitoring, dashboards externes).
 * Usage : npm run print:post-launch
 */
const base = (process.env.VERIFY_PROD_URL || "https://www.optimum-assurance.fr").replace(/\/$/, "")

console.log(`
✅ Après déploiement — rappels rapides

Google Search Console
  · Soumettre le sitemap : ${base}/sitemap.xml
  · Inspection d’URL pour les pages clés

Monitoring
  · Health : ${base}/api/health

Webhooks & crons
  · Mollie : ${base}/api/mollie/webhook
  · Planification crons + CRON_SECRET : npm run print:crons

Vérifications locales
  · npm run verify:vercel-env
  · npm run preflight
`)
