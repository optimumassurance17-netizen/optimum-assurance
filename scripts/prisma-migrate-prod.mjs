#!/usr/bin/env node
/**
 * Applique les migrations Prisma sur la base définie dans .env.vercel.pull
 * (DATABASE_URL Production Vercel). Ne pas committer .env.vercel.pull.
 *
 * Usage :
 *   npx vercel env pull .env.vercel.pull --environment production --yes
 *   node scripts/prisma-migrate-prod.mjs
 */
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { config } from "dotenv"

const root = resolve(process.cwd())
const pullPath = resolve(root, ".env.vercel.pull")
const prismaBin = resolve(root, "node_modules", ".bin", process.platform === "win32" ? "prisma.cmd" : "prisma")

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

const r = spawnSync(prismaBin, ["migrate", "deploy"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: url },
  shell: false,
})

process.exit(r.status ?? 1)
