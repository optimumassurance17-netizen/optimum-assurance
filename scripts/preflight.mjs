#!/usr/bin/env node
/**
 * Vérifications avant déploiement : schéma Prisma + variables d'environnement.
 * Usage: npm run preflight
 */
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

function run(label, command, args) {
  console.log(`\n→ ${label}…`)
  const r = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: process.env,
  })
  if (r.status !== 0) {
    console.error(`\n❌ Échec : ${label}`)
    process.exit(1)
  }
}

console.log("\n🚀 Preflight — mise en ligne rapide\n")

// Prisma validate exige une DATABASE_URL syntaxiquement valide — fallback si .env local incomplet
const envPreflight = { ...process.env }
if (!envPreflight.DATABASE_URL?.startsWith("postgres")) {
  envPreflight.DATABASE_URL = "postgresql://preflight:preflight@127.0.0.1:5432/preflight"
}

console.log("\n→ Prisma (schéma valide)…")
const v = spawnSync("npx", ["prisma", "validate"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: envPreflight,
})
if (v.status !== 0) {
  console.error("\n❌ Échec : prisma validate")
  process.exit(1)
}
run("Variables d'environnement", "node", ["scripts/check-env.mjs"])

console.log("\n✅ Preflight terminé — vous pouvez lancer `npm run build` ou `npm run vercel-build`.\n")
