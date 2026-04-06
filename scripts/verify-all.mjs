#!/usr/bin/env node
/**
 * Suite de vérifications locale + prod distante + Vercel + Supabase (si configuré).
 * Usage : npm run verify:all
 * Prérequis optionnel : npx vercel env pull .env.vercel.pull --environment production --yes
 */
import { spawnSync } from "node:child_process"
import { resolve } from "node:path"

const root = resolve(process.cwd())

const steps = [
  ["audit:env", "Audit fichiers .env"],
  ["typecheck", "TypeScript"],
  ["lint", "ESLint"],
  ["preflight", "Prisma + check-env + Supabase (si configuré)"],
  ["verify:vercel-env", "Variables Vercel Production"],
  ["verify:prod", "Health + robots + sitemap (prod)"],
]

let failed = false
for (const [script, label] of steps) {
  console.log(`\n━━━ ${label} (npm run ${script}) ━━━\n`)
  const r = spawnSync("npm", ["run", script], {
    stdio: "inherit",
    cwd: root,
    shell: true,
    env: process.env,
  })
  if (r.status !== 0) {
    failed = true
    console.error(`\n❌ Échec : ${script}\n`)
    process.exit(r.status ?? 1)
  }
}

if (!failed) {
  console.log("\n✅ verify:all — toutes les étapes ont réussi.\n")
  console.log("   (Build non inclus — lancer : npm run build)\n")
}
