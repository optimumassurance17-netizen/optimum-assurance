#!/usr/bin/env node
/**
 * Répare la colonne + l’historique Prisma après une migration « failed ».
 * Utilise DATABASE_URL (.env / .env.local, ou export manuel).
 *
 * Pour la prod Vercel :
 *   npx vercel env pull .env.vercel.pull --environment production --yes
 * Puis sous PowerShell :
 *   $env:DATABASE_URL = (Get-Content .env.vercel.pull | Where-Object { $_ -match '^DATABASE_URL=' } | ForEach-Object { $_ -replace '^DATABASE_URL=','' }).Trim().Trim('"')
 *   node scripts/prisma-repair-exclusions-flow.mjs
 */
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { config } from "dotenv"

const root = resolve(process.cwd())
const prismaBin = resolve(root, "node_modules", ".bin", process.platform === "win32" ? "prisma.cmd" : "prisma")
const sqlFile = resolve(root, "sql", "prisma-repair-exclusions-column.sql")

for (const f of [resolve(root, ".env.local"), resolve(root, ".env")]) {
  if (existsSync(f)) config({ path: f, override: false })
}

if (!process.env.DATABASE_URL?.trim()) {
  console.error("DATABASE_URL manquant.")
  process.exit(1)
}

function run(args) {
  const r = spawnSync(prismaBin, args, { cwd: root, stdio: "inherit", env: process.env, shell: false })
  return r.status ?? 1
}

console.error("→ prisma db execute (colonne exclusionsJson)\n")
if (run(["db", "execute", "--file", sqlFile]) !== 0) {
  console.error(
    "\nSi l’erreur indique que la table « InsuranceContract » n’existe pas, le schéma complet manque :"
  )
  console.error("  npx prisma db push   (avec cette DATABASE_URL, une fois, en ayant vérifié la cible)\n")
  process.exit(1)
}

console.error("\n→ prisma migrate resolve --applied\n")
const resolveStatus = run(["migrate", "resolve", "--applied", "20260406000000_add_insurance_exclusions_json"])
if (resolveStatus !== 0) {
  console.error(
    "\n(resolve a échoué : migration peut-être déjà marquée appliquée. Enchaîne quand même avec migrate deploy si besoin.)\n"
  )
}

console.error("\n→ prisma migrate deploy\n")
if (run(["migrate", "deploy"]) !== 0) process.exit(1)

console.error("\n✅ OK. Vérifie : npx prisma migrate status\n")
