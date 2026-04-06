#!/usr/bin/env node
/**
 * Applique sql/supabase-esign-rls-policies.sql (politiques RLS sign_requests / signatures).
 *
 * Variables : SUPABASE_DATABASE_URL ou DATABASE_URL_SUPABASE
 *
 * Usage : npm run supabase:apply-esign-policies
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
    if (m) {
      const key = m[1]
      const val = m[2].replace(/^["']|["']$/g, "").trim()
      if (override) {
        if (val) process.env[key] = val
      } else if (val && !process.env[key]) {
        process.env[key] = val
      }
    }
  }
}

loadEnvFile(resolve(root, ".env"))
loadEnvFile(resolve(root, ".env.local"), { override: true })

const dbUrl = (process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL_SUPABASE || "").trim()
const sqlFile = resolve(root, "sql/supabase-esign-rls-policies.sql")

if (!dbUrl) {
  console.error(`
❌ Définissez SUPABASE_DATABASE_URL dans .env.local
`)
  process.exit(1)
}

if (!existsSync(sqlFile)) {
  console.error("❌ Fichier introuvable :", sqlFile)
  process.exit(1)
}

console.log("\n→ Application des politiques RLS (sign_requests, signatures)…\n")

const r = spawnSync("npx", ["prisma", "db", "execute", "--file", sqlFile, "--url", dbUrl], {
  stdio: "inherit",
  cwd: root,
  env: process.env,
  shell: true,
})
if (r.status !== 0) {
  console.error("\n❌ Échec — vérifiez l’URI.\n")
  process.exit(1)
}

console.log("\n✅ Politiques appliquées. Vérifiez l’advisor Supabase.\n")
