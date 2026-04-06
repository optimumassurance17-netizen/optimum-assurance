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

2) SQL Editor : ouvrir et exécuter le fichier :
   ${sqlPath}
   ${sqlOk ? "✅ Fichier présent." : "⚠️  Fichier introuvable à cet emplacement."}

3) Project Settings → API :
   • Project URL     → NEXT_PUBLIC_SUPABASE_URL
   • anon public     → NEXT_PUBLIC_SUPABASE_ANON_KEY
   • service_role    → SUPABASE_SERVICE_ROLE_KEY (secret — jamais côté client)

4) Vercel → Settings → Environment Variables → Production :
   Ajouter les 3 variables ci-dessus, puis Redeploy.

5) Vérification locale (après vercel env pull ou copie dans .env.local) :
   npm run verify:supabase

6) Test script (si configuré) :
   npm run esign:create-request -- …

══════════════════════════════════════════════════════════════
`)
