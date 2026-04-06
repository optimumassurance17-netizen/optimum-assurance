#!/usr/bin/env node
/**
 * Rappel des crons déclarés dans vercel.json (planification, chemins, sécurité).
 * Usage : npm run print:crons
 *         VERIFY_PROD_URL=https://www.x.fr node scripts/print-crons.mjs
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = resolve(process.cwd())
const vercelPath = resolve(root, "vercel.json")
const vercel = JSON.parse(readFileSync(vercelPath, "utf-8"))
const crons = vercel.crons || []
const base = (process.env.VERIFY_PROD_URL || process.argv[2] || "https://www.optimum-assurance.fr").replace(
  /\/$/,
  ""
)

console.log(`
📅 Crons Vercel (${vercelPath})

Les invocations **Production** envoient automatiquement :
  Authorization: Bearer <CRON_SECRET>
si la variable **CRON_SECRET** est définie sur le projet Vercel (voir doc Vercel « Securing cron jobs »).

Sans CRON_SECRET en production, les routes répondent **503** (voir lib/cron-auth.ts).
Santé : GET ${base}/api/health → champ JSON **crons.secret** (configured | missing).

Planification en **UTC** (expressions cron classiques) :
`)

for (const c of crons) {
  console.log(`  • ${String(c.schedule).padEnd(14)}  ${c.path}`)
}

console.log(`
URLs complètes (pour logs / tests — **attention** : effets réels emails / Mollie / base) :
`)

for (const c of crons) {
  console.log(`  ${base}${c.path}`)
}

console.log(`
Test manuel (effets réels : emails / Mollie) : en-tête Authorization Bearer = valeur de CRON_SECRET.
  Ex. curl.exe -sS -H "Authorization: Bearer VOTRE_SECRET" "${base}/api/cron/rappels-renouvellement"

Dashboard : Vercel → Projet → Settings → Cron Jobs → View Logs par chemin.
Documentation : docs/SEPA-RECURRENT-MOLLIE.md (prélèvements T2–T4).
`)
