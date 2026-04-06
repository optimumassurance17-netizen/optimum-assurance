#!/usr/bin/env node
/**
 * Vérifie la config Supabase (intégration Vercel + service role) et l’existence
 * des ressources MVP signature : tables sign_requests / signatures, buckets documents / signed_documents.
 *
 * Usage : npm run verify:supabase
 * Charge .env puis .env.local (comme Next.js).
 */
import { createClient } from "@supabase/supabase-js"
import { readFileSync, existsSync } from "node:fs"
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
/** Fichier créé par `vercel env pull .env.vercel.pull` (déjà couvert par .gitignore via .env*). */
loadEnvFile(resolve(root, ".env.vercel.pull"), { override: true })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim()

console.log("\n🔌 Vérification Supabase (signature / Storage)\n")

if (!url) {
  console.log("○ NEXT_PUBLIC_SUPABASE_URL absent — rien à vérifier (optionnel).\n")
  process.exit(0)
}

if (!url.startsWith("https://") || !url.includes("supabase.co")) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL semble invalide :", url.slice(0, 48) + "…")
  process.exit(1)
}

if (!serviceKey) {
  console.log("⚠️  SUPABASE_SERVICE_ROLE_KEY manquant — impossible de vérifier les tables / buckets.")
  console.log("   L’intégration Vercel envoie souvent l’URL + la clé anon uniquement.")
  console.log("   Ajoute la clé service_role : Supabase → Project Settings → API → service_role")
  console.log("   puis Vercel → Environment Variables → Redeploy.")
  console.log("   Ensuite : npm run verify:supabase\n")
  process.exit(0)
}

if (!anonKey) {
  console.log("⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY manquant (recommandé pour le client Supabase).\n")
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

let failed = false

const { error: t1 } = await supabase.from("sign_requests").select("id").limit(1)
if (t1) {
  const msg = t1.message || String(t1)
  if (/relation|does not exist|schema cache|not find/i.test(msg)) {
    console.error("❌ Table public.sign_requests introuvable.")
    console.error("   Exécute sql/supabase-esign-complete.sql ou : npm run supabase:install\n")
    failed = true
  } else {
    console.error("❌ sign_requests :", msg, "\n")
    failed = true
  }
} else {
  console.log("✅ Table sign_requests accessible")
}

const { error: t2 } = await supabase.from("signatures").select("id").limit(1)
if (t2) {
  const msg = t2.message || String(t2)
  if (/relation|does not exist|schema cache|not find/i.test(msg)) {
    console.error("❌ Table public.signatures introuvable.\n")
    failed = true
  } else {
    console.error("❌ signatures :", msg, "\n")
    failed = true
  }
} else {
  console.log("✅ Table signatures accessible")
}

for (const bucket of ["documents", "signed_documents"]) {
  const { error: be } = await supabase.storage.from(bucket).list("", { limit: 1 })
  if (be) {
    const msg = be.message || String(be)
    if (/not found|bucket|does not exist/i.test(msg)) {
      console.error(`❌ Bucket Storage « ${bucket} » introuvable ou inaccessible.`)
      console.error("   Exécute sql/supabase-esign-storage.sql (ou la migration supabase/migrations/).\n")
      failed = true
    } else {
      console.error(`❌ Bucket ${bucket} :`, msg, "\n")
      failed = true
    }
  } else {
    console.log(`✅ Bucket « ${bucket} » accessible`)
  }
}

if (failed) {
  console.log("💡 Après correction sur le dashboard Supabase, relance : npm run verify:supabase\n")
  process.exit(1)
}

console.log("\n✅ Supabase OK pour /sign et /api/sign.\n")
process.exit(0)
