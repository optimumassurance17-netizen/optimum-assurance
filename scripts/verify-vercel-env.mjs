#!/usr/bin/env node
/**
 * Compare les clés attendues avec celles déclarées sur Vercel (Production).
 * Usage : npm run verify:vercel-env
 * Prérequis : projet lié (.vercel), `npx vercel login`
 */
import { execSync } from "node:child_process"
import { resolve } from "node:path"

const root = resolve(process.cwd())

/** Aligné sur scripts/check-env.mjs (obligatoires + sécurité prod) */
const REQUIRED_PRODUCTION = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "NEXT_PUBLIC_APP_URL",
  "ADMIN_EMAILS",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "MOLLIE_API_KEY",
  "CRON_SECRET",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
]

/** Utiles selon les fonctionnalités activées */
const OPTIONAL_NOTES = [
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "Client Supabase (usage futur côté navigateur)"],
  ["YOUSIGN_API_KEY", "Legacy — webhook Yousign si encore utilisé"],
  ["YOUSIGN_ENV", "Legacy — sandbox ou production"],
  ["YOUSIGN_WEBHOOK_SECRET", "Legacy — vérification webhooks Yousign"],
  ["NEXT_PUBLIC_SITE_CANONICAL", "SEO — URL canonique (recommandé sur Vercel Production)"],
  ["UPSTASH_REDIS_REST_URL", "Rate limit distribué (chat / contact)"],
  ["UPSTASH_REDIS_REST_TOKEN", "Avec Upstash"],
  ["NEXT_PUBLIC_PHONE", "Affichage site"],
  ["NEXT_PUBLIC_WHATSAPP", "Affichage site"],
  ["PAPPERS_API_KEY", "Pré-remplissage SIRET"],
  ["MOLLIE_PUBLIC_BASE_URL", "Souvent inutile si NEXT_PUBLIC_APP_URL suffit"],
  ["DEVIS_ALERT_EMAILS", "Alertes internes nouvelles demandes de devis (sinon ADMIN_EMAILS / CONTACT_EMAIL)"],
]

function parseVercelJson(stdout) {
  const i = stdout.indexOf("{")
  if (i === -1) throw new Error("Réponse Vercel inattendue (pas de JSON). Êtes-vous connecté ? `npx vercel login`")
  return JSON.parse(stdout.slice(i))
}

function hasProductionTarget(entry) {
  const t = entry.target
  return Array.isArray(t) && t.includes("production")
}

let stdout
try {
  stdout = execSync("npx vercel env list production --format json", {
    encoding: "utf-8",
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 2 * 1024 * 1024,
  })
} catch {
  console.error("\n❌ Impossible d’exécuter `vercel env list production`. Vérifiez le lien projet et la session (`npx vercel login`).\n")
  process.exit(1)
}

let data
try {
  data = parseVercelJson(stdout)
} catch (e) {
  console.error(e.message)
  process.exit(1)
}

const envs = data.envs || []
const prodKeys = new Set(envs.filter(hasProductionTarget).map((e) => e.key))

console.log("\n🔍 Vercel — variables Production (clés présentes)\n")
console.log("   Total clés avec cible production :", prodKeys.size)

let missing = []
for (const key of REQUIRED_PRODUCTION) {
  if (!prodKeys.has(key)) missing.push(key)
}

if (missing.length === 0) {
  console.log("\n✅ Toutes les clés requises pour la prod sont déclarées sur Vercel.\n")
} else {
  console.log("\n❌ Manquantes sur Vercel (Production) :")
  missing.forEach((k) => console.log("   -", k))
  console.log("\n💡 Ajoutez-les dans Vercel → Settings → Environment Variables → Production, puis redéployez.\n")
  process.exit(1)
}

const optionalPresent = OPTIONAL_NOTES.filter(([k]) => prodKeys.has(k))
const optionalAbsent = OPTIONAL_NOTES.filter(([k]) => !prodKeys.has(k))
if (optionalAbsent.length) {
  console.log("ℹ️  Optionnelles absentes (normal si non utilisées) :")
  optionalAbsent.forEach(([k, note]) => console.log("   -", k, "→", note))
  console.log("")
}
if (optionalPresent.length) {
  console.log("✅ Optionnelles présentes :", optionalPresent.map(([k]) => k).join(", "))
  console.log("")
}

const supabaseBundle = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
]
const supabaseOk = supabaseBundle.every((k) => prodKeys.has(k))
const supabasePartial = supabaseBundle.some((k) => prodKeys.has(k)) && !supabaseOk
if (supabaseOk) {
  console.log("✅ Signature Supabase (/api/sign) : les 3 variables sont déclarées sur Vercel.\n")
} else if (supabasePartial) {
  console.log(
    "⚠️  Signature Supabase : configuration incomplète — ajoutez les 3 clés (URL, anon, service_role). `npm run vercel:push-supabase-env` après les avoir mises dans .env.local\n"
  )
} else if (!supabaseBundle.some((k) => prodKeys.has(k))) {
  console.log("ℹ️  Signature Supabase : non configurée sur Vercel — voir `npm run print:supabase-signature`.\n")
}

const yousignLegacy = ["YOUSIGN_API_KEY", "YOUSIGN_ENV", "YOUSIGN_WEBHOOK_SECRET"].filter((k) => prodKeys.has(k))
if (yousignLegacy.length > 0) {
  console.log("ℹ️  Yousign (legacy) : clés présentes — webhook `/api/yousign/webhook` si encore utilisé.\n")
}

console.log("✅ verify-vercel-env terminé.\n")
