#!/usr/bin/env node
/**
 * Rappel des étapes pour activer la signature MVP Supabase (/api/sign).
 * Usage : npm run print:supabase-signature
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const sqlPath = resolve(process.cwd(), "sql/supabase-esign-complete.sql")
let sqlOk = false
try {
  readFileSync(sqlPath, "utf-8")
  sqlOk = true
} catch {
  /* */
}

console.log(`
══════════════════════════════════════════════════════════════
  Activation signature Supabase (MVP) — /api/sign + Storage
══════════════════════════════════════════════════════════════

1) Projet Supabase (supabase.com) — ou utiliser un projet existant.

2) Schéma + buckets sur la base Postgres **Supabase** (pas Neon) :
   • soit coller ${sqlPath} dans le SQL Editor,
   • soit en local avec l’URI Postgres du projet : SUPABASE_DATABASE_URL dans .env.local puis
     npm run supabase:apply-esign-sql
   ${sqlOk ? "✅ Fichier SQL présent." : "⚠️  Fichier SQL introuvable."}

3) Project Settings → API :
   • Project URL     → NEXT_PUBLIC_SUPABASE_URL
   • anon public     → NEXT_PUBLIC_SUPABASE_ANON_KEY
   • service_role    → SUPABASE_SERVICE_ROLE_KEY (secret — jamais côté client)

4) Vercel — après avoir copié les 3 clés dans .env.local :
   npm run vercel:push-supabase-env
   puis : npx vercel deploy --prod --yes

   (Ou ajout manuel dans le dashboard Vercel.)

5) Vérification locale (après vercel env pull ou copie dans .env.local) :
   npm run verify:supabase

6) Test script (si configuré) :
   npm run esign:create-request -- …

══════════════════════════════════════════════════════════════
`)
