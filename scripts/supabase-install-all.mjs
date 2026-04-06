#!/usr/bin/env node
/**
 * Installe tout le SQL Supabase attendu par Optimum Assurance (ordre sûr, idempotent où possible).
 *
 * Prérequis dans .env.local :
 *   SUPABASE_DATABASE_URL=postgresql://postgres.[ref]:[MDP]@db.[ref].supabase.co:5432/postgres
 *   (Project Settings → Database → Connection string → URI — préférer port 5432 « direct », pas le pooler 6543 si erreurs.)
 *
 * Étapes :
 *   1. supabase-esign-complete.sql     — signature + buckets + RLS sign_requests / signatures
 *   2. supabase-rls-utilisateurs…      — RLS advisor (tables si elles existent)
 *   3. supabase-seo-programmatic.sql     — tables SEO + RLS lecture publique + exemples
 *   4. supabase-contenus-seo-slug.sql    — colonne slug pour npm run seo:bulk
 *
 * Options :
 *   --esign-only   — étape 1 uniquement (signature /api/sign)
 *   --seo-only     — étapes 3–4 (tables SEO ; la 2 est ignorée)
 *   --with-remplissage — après 4, exécute supabase-seo-remplissage-copier-coller.sql (plus de villes / lignes)
 *
 * Copier-coller sans CLI : utiliser le fichier généré sql/supabase-bootstrap-all-in-one.sql
 * (npm run supabase:bundle pour le régénérer après modification des sources).
 *
 * Usage : npm run supabase:install
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

const args = process.argv.slice(2)
const esignOnly = args.includes("--esign-only")
const seoOnly = args.includes("--seo-only")
const withRemplissage = args.includes("--with-remplissage")

if (esignOnly && seoOnly) {
  console.error("❌ Utilisez soit --esign-only soit --seo-only, pas les deux.\n")
  process.exit(1)
}

const dbUrl = (process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL_SUPABASE || "").trim()

if (!dbUrl) {
  console.error(`
❌ Définissez SUPABASE_DATABASE_URL dans .env.local

   Supabase → Project Settings → Database → Connection string → URI
   Exemple :
   SUPABASE_DATABASE_URL=postgresql://postgres.[project-ref]:[PASSWORD]@db.[project-ref].supabase.co:5432/postgres
`)
  process.exit(1)
}

/** @type {Array<{ label: string, file: string }>} */
let steps = []

if (esignOnly) {
  steps = [{ label: "Signature + Storage (esign-complete)", file: "sql/supabase-esign-complete.sql" }]
} else if (seoOnly) {
  steps = [
    { label: "SEO programmatique (tables + RLS)", file: "sql/supabase-seo-programmatic.sql" },
    { label: "Contenus SEO — colonne slug", file: "sql/supabase-contenus-seo-slug.sql" },
  ]
} else {
  steps = [
    { label: "Signature + Storage (esign-complete)", file: "sql/supabase-esign-complete.sql" },
    {
      label: "RLS utilisateurs / entreprises / devis (si tables présentes)",
      file: "sql/supabase-rls-utilisateurs-entreprises-devis.sql",
    },
    { label: "SEO programmatique (tables + RLS)", file: "sql/supabase-seo-programmatic.sql" },
    { label: "Contenus SEO — colonne slug", file: "sql/supabase-contenus-seo-slug.sql" },
  ]
}

if (withRemplissage && !esignOnly) {
  steps.push({
    label: "Remplissage SEO (villes / lignes — optionnel)",
    file: "sql/supabase-seo-remplissage-copier-coller.sql",
  })
}

function runSql(label, relativePath) {
  const sqlFile = resolve(root, relativePath)
  if (!existsSync(sqlFile)) {
    console.error("❌ Fichier introuvable :", sqlFile)
    process.exit(1)
  }
  console.log(`\n→ ${label}\n   ${relativePath}\n`)
  const r = spawnSync("npx", ["prisma", "db", "execute", "--file", sqlFile, "--url", dbUrl], {
    stdio: "inherit",
    cwd: root,
    env: process.env,
    shell: true,
  })
  if (r.status !== 0) {
    console.error(`\n❌ Échec sur : ${relativePath}\n`)
    process.exit(1)
  }
}

console.log("\n🔧 Installation SQL Supabase —", steps.length, "fichier(s)\n")

for (const s of steps) {
  runSql(s.label, s.file)
}

console.log(`
✅ SQL appliqué.

   Ensuite :
   • npm run verify:supabase   (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY en local)
   • npm run vercel:push-supabase-env   si besoin de synchroniser les clés vers Vercel
`)
