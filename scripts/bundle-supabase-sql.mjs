#!/usr/bin/env node
/**
 * Regénère sql/supabase-bootstrap-all-in-one.sql à partir des fichiers sources
 * (pour coller une seule fois dans Supabase → SQL Editor sans Prisma CLI).
 *
 * Usage : npm run supabase:bundle
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")

const parts = [
  {
    title: "PARTIE 1 — Signature + Storage (supabase-esign-complete.sql)",
    file: "sql/supabase-esign-complete.sql",
  },
  {
    title: "PARTIE 2 — RLS advisor (supabase-rls-utilisateurs-entreprises-devis.sql)",
    file: "sql/supabase-rls-utilisateurs-entreprises-devis.sql",
  },
  {
    title: "PARTIE 3 — SEO programmatique (supabase-seo-programmatic.sql)",
    file: "sql/supabase-seo-programmatic.sql",
  },
  {
    title: "PARTIE 4 — Colonne slug contenus SEO (supabase-contenus-seo-slug.sql)",
    file: "sql/supabase-contenus-seo-slug.sql",
  },
]

let out = `-- =============================================================================
-- FICHIER GÉNÉRÉ — ne pas éditer à la main
-- Source : npm run supabase:bundle (scripts/bundle-supabase-sql.mjs)
-- Coller dans Supabase → SQL → New query → Run (une fois par projet, ou après reset)
-- Alternative CLI : npm run supabase:install (même ordre, via Prisma)
-- =============================================================================

`

for (const p of parts) {
  const fp = resolve(root, p.file)
  if (!existsSync(fp)) {
    console.error("❌ Manquant :", fp)
    process.exit(1)
  }
  const body = readFileSync(fp, "utf-8").trimEnd()
  out += `\n-- === ${p.title} ===\n\n`
  out += body
  out += "\n\n"
}

const dest = resolve(root, "sql/supabase-bootstrap-all-in-one.sql")
writeFileSync(dest, out, "utf-8")
console.log("✅ Écrit :", dest, `(${out.length} caractères)\n`)
