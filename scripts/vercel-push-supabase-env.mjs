#!/usr/bin/env node
/**
 * Pousse NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 * depuis .env / .env.local vers Vercel (Production), avec --force si la clé existe déjà.
 *
 * Prérequis : valeurs renseignées en local (copiées depuis Supabase → Project Settings → API).
 *
 * Usage : npm run vercel:push-supabase-env
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

const keys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
]

const missing = keys.filter((k) => !process.env[k]?.trim())
if (missing.length) {
  console.error(`
❌ Variables manquantes en local : ${missing.join(", ")}

   Ajoutez-les dans .env.local (Supabase → Project Settings → API) puis relancez.
`)
  process.exit(1)
}

console.log("\n→ Envoi des 3 variables vers Vercel (Production)…\n")

for (const name of keys) {
  const value = process.env[name].trim()
  const r = spawnSync(
    "npx",
    ["vercel", "env", "add", name, "production", "--value", value, "--yes", "--force"],
    { stdio: "inherit", cwd: root, shell: true, env: process.env }
  )
  if (r.status !== 0) {
    console.error(`\n❌ Échec pour ${name}\n`)
    process.exit(1)
  }
}

console.log(`
✅ Variables Supabase sur Vercel Production.

   Étapes suivantes :
   • Redéployer : npx vercel deploy --prod --yes
   • Vérifier : npm run verify:supabase (après vercel env pull)
`)
