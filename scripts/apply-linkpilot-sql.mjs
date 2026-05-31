#!/usr/bin/env node
/**
 * Applique la migration SQL LinkPilot AI sur la base Supabase.
 *
 * Variables attendues :
 * - SUPABASE_DATABASE_URL (prioritaire)
 * - ou DATABASE_URL_SUPABASE
 *
 * Usage : npm run linkpilot:apply-sql
 */
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = resolve(process.cwd())

function loadEnvFile(filePath, { override = false } = {}) {
  if (!existsSync(filePath)) return
  const content = readFileSync(filePath, "utf-8")
  for (const line of content.split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!m) continue
    const key = m[1]
    const val = m[2].replace(/^["']|["']$/g, "").trim()
    if (!val) continue
    if (override || !process.env[key]) process.env[key] = val
  }
}

loadEnvFile(resolve(root, ".env"))
loadEnvFile(resolve(root, ".env.local"), { override: true })
loadEnvFile(resolve(root, ".env.vercel.pull"), { override: true })

const dbUrl = (process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL_SUPABASE || "").trim()
const sqlFile = resolve(root, "supabase/migrations/create_linkpilot_ai_tables.sql")

if (!dbUrl) {
  console.error(`
❌ SUPABASE_DATABASE_URL absent.
   Renseignez SUPABASE_DATABASE_URL (ou DATABASE_URL_SUPABASE) dans .env.local.
`)
  process.exit(1)
}

if (!existsSync(sqlFile)) {
  console.error(`❌ Fichier SQL introuvable : ${sqlFile}`)
  process.exit(1)
}

console.log("\n→ Application migration LinkPilot AI...\n")

const result = spawnSync(
  "npx",
  ["prisma", "db", "execute", "--file", sqlFile, "--url", dbUrl],
  {
    stdio: "inherit",
    cwd: root,
    env: process.env,
    shell: true,
  }
)

if (result.status !== 0) {
  console.error("\n❌ Échec migration LinkPilot.\n")
  process.exit(1)
}

console.log("\n✅ Migration LinkPilot appliquée.\n")
