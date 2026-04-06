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

Webhooks & crons (détail : npm run print:webhooks)
  · Mollie : ${base}/api/mollie/webhook
  · Yousign : ${base}/api/yousign/webhook

Vérifications locales
  · npm run verify:vercel-env
  · npm run preflight
`)
