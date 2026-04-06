#!/usr/bin/env node
/**
 * Synchronise le schéma Prisma sur la base Production (DATABASE_URL dans .env.vercel.pull).
 * 1) prisma db push — crée / met à jour les tables si besoin
 * 2) migrate resolve --applied (migration exclusions si elle était en failed)
 * 3) prisma migrate deploy
 * 4) prisma migrate status
 *
 * Prérequis : npx vercel env pull .env.vercel.pull --environment production --yes
 *
 * Utilise `npx prisma` (fiable sous Windows ; spawn direct sur prisma.cmd peut renvoyer un code erroné).
 */
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { execSync } from "node:child_process"
import { config } from "dotenv"

const root = resolve(process.cwd())
const pullPath = resolve(root, ".env.vercel.pull")

if (!existsSync(pullPath)) {
  console.error("Fichier manquant : .env.vercel.pull")
  console.error("Lance : npx vercel env pull .env.vercel.pull --environment production --yes")
  process.exit(1)
}

config({ path: pullPath, override: true })

const url = process.env.DATABASE_URL?.trim()
if (!url?.startsWith("postgres")) {
  console.error("DATABASE_URL absente ou invalide dans .env.vercel.pull (attendu postgresql://…).")
  process.exit(1)
}

const env = { ...process.env, DATABASE_URL: url }

function run(args, { optional = false } = {}) {
  const cmd = `npx prisma ${args.map((a) => (a.includes(" ") ? `"${a}"` : a)).join(" ")}`
  console.error(`\n→ ${cmd}\n`)
  try {
    execSync(cmd, { cwd: root, env, stdio: "inherit", shell: true })
    return 0
  } catch (e) {
    const code = typeof e?.status === "number" ? e.status : 1
    if (!optional) process.exit(code)
    console.error(`(étape optionnelle ignorée, code ${code})\n`)
    return code
  }
}

run(["db", "push"])
run(
  ["migrate", "resolve", "--applied", "20260406000000_add_insurance_exclusions_json"],
  { optional: true }
)
run(["migrate", "deploy"])
run(["migrate", "status"])
console.error("\n✅ Synchronisation prod terminée.\n")
