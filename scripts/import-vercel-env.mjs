#!/usr/bin/env node
/**
 * Importe les variables de vercel-env.env vers Vercel via la CLI.
 * Prérequis : vercel link (projet lié) et vercel login (connecté).
 *
 * Usage: node scripts/import-vercel-env.mjs
 *        ou: npm run vercel:import
 */
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { execSync } from "node:child_process"

const root = resolve(process.cwd())
const envPath = resolve(root, "vercel-env.env")

if (!existsSync(envPath)) {
  console.error("❌ Fichier vercel-env.env introuvable.")
  process.exit(1)
}

const content = readFileSync(envPath, "utf-8")
const vars = []

for (const line of content.split("\n")) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith("#")) continue

  const eqIndex = trimmed.indexOf("=")
  if (eqIndex === -1) continue

  const key = trimmed.substring(0, eqIndex).trim()
  let value = trimmed.substring(eqIndex + 1).trim()

  // Retirer les guillemets si présents
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }

  // Ignorer DATABASE_URL (ajouté automatiquement par Vercel Postgres)
  if (key === "DATABASE_URL") continue

  vars.push({ key, value })
}

if (vars.length === 0) {
  console.error("❌ Aucune variable trouvée dans vercel-env.env")
  process.exit(1)
}

const ENVIRONMENTS = ["production", "development"]

function addOne(key, value, env) {
  execSync(`npx vercel env add ${key} ${env} --yes --force`, {
    input: value,
    encoding: "utf8",
    stdio: ["pipe", "inherit", "inherit"],
  })
}

async function main() {
  console.log("📤 Import des variables vers Vercel...")
  console.log(`   ${vars.length} variables × ${ENVIRONMENTS.length} environnements\n`)

  for (const { key, value } of vars) {
    for (const env of ENVIRONMENTS) {
      try {
        addOne(key, value, env)
        console.log(`   ✓ ${key} (${env})`)
      } catch (e) {
        console.error(`   ✗ ${key} (${env}): ${e.message}`)
      }
    }
  }

  console.log("\n✅ Import terminé")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
