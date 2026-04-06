#!/usr/bin/env node
/**
 * Vérifie la configuration des variables d'environnement
 * Usage: node scripts/check-env.mjs (charge .env via dotenv si dispo)
 */
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

// Comme Next.js : .env puis .env.local (local surcharge)
loadEnvFile(resolve(root, ".env"))
loadEnvFile(resolve(root, ".env.local"), { override: true })

const vars = [
  { key: "MOLLIE_API_KEY", required: true, hint: "Clé Mollie (test_ ou live_)" },
  {
    key: "MOLLIE_PUBLIC_BASE_URL",
    required: false,
    hint: "Optionnel — URL HTTPS publique pour webhooks Mollie (ex. ngrok en local) ; sinon NEXT_PUBLIC_APP_URL",
  },
  { key: "NEXT_PUBLIC_APP_URL", required: true, hint: "URL du site" },
  { key: "DATABASE_URL", required: true, hint: "Connexion base de données" },
  { key: "NEXTAUTH_URL", required: true, hint: "URL NextAuth" },
  { key: "NEXTAUTH_SECRET", required: true, hint: "Secret (npm run generate-secret)" },
  { key: "ADMIN_EMAILS", required: true, hint: "Emails admin CRM" },
  { key: "RESEND_API_KEY", required: true, hint: "Clé Resend (resend.com)" },
  { key: "EMAIL_FROM", required: true, hint: "Email expéditeur" },
  { key: "YOUSIGN_API_KEY", required: false, hint: "Legacy — webhook / API Yousign si encore utilisé" },
  { key: "YOUSIGN_ENV", required: false, hint: "Legacy — sandbox ou production" },
  { key: "NEXT_PUBLIC_SITE_CANONICAL", required: false, hint: "Optionnel — URL canonique forcée SEO (ex. https://www.optimum-assurance.fr)" },
  { key: "NEXT_PUBLIC_PHONE", required: false, hint: "Téléphone affiché" },
  { key: "NEXT_PUBLIC_EMAIL", required: false, hint: "Email de contact" },
  { key: "NEXT_PUBLIC_WHATSAPP", required: false, hint: "WhatsApp (sans espaces)" },
  { key: "PAPPERS_API_KEY", required: false, hint: "Optionnel - pré-remplissage SIRET (Pappers)" },
  { key: "INSEE_API_KEY_INTEGRATION", required: false, hint: "Optionnel - pré-remplissage SIRET (INSEE gratuit)" },
  { key: "CRON_SECRET", required: false, hint: "Recommandé - sécurise les crons Vercel (rappels)" },
  { key: "YOUSIGN_WEBHOOK_SECRET", required: false, hint: "Recommandé - vérifie la signature des webhooks YouSign" },
  { key: "UPSTASH_REDIS_REST_URL", required: false, hint: "Optionnel - rate limit distribué (chat / contact) sur Vercel" },
  { key: "UPSTASH_REDIS_REST_TOKEN", required: false, hint: "Avec UPSTASH_REDIS_REST_URL (console upstash.com)" },
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    required: true,
    hint: "Supabase — URL projet (.supabase.co), signature /api/sign + Storage",
  },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", required: false, hint: "Optionnel — clé anon (usage client futur)" },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    required: true,
    hint: "Supabase service role — signature électronique /api/sign et routes gestion",
  },
]

const okKeys = new Set(
  vars
    .filter((v) => {
      const val = process.env[v.key]
      return val && val !== "changez-moi-en-production" && !val.includes("xxxx")
    })
    .map((v) => v.key)
)
const missing = vars.filter((v) => !okKeys.has(v.key))
const requiredMissing = missing.filter((v) => v.required)

console.log("\n📋 Vérification des variables d'environnement\n")
console.log("✅ Configurées:", okKeys.size, "/", vars.length)
if (requiredMissing.length) {
  console.log("\n❌ Manquantes (obligatoires):")
  requiredMissing.forEach((v) => console.log("   -", v.key, "→", v.hint))
}
const optionalMissing = missing.filter((v) => !v.required)
if (optionalMissing.length) {
  console.log("\n⚠️  Manquantes (optionnelles):")
  optionalMissing.forEach((v) => console.log("   -", v.key, "→", v.hint))
}
if (requiredMissing.length === 0) {
  console.log("\n✅ Toutes les variables obligatoires sont configurées.\n")
} else {
  console.log("\n💡 Copiez .env.example vers .env et renseignez les valeurs.\n")
  process.exit(1)
}

// Avertissements production (ne font pas échouer le script)
const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")
const authUrl = (process.env.NEXTAUTH_URL || "").replace(/\/$/, "")
if (appUrl.includes("localhost") || appUrl.includes("127.0.0.1")) {
  console.log("⚠️  NEXT_PUBLIC_APP_URL pointe vers localhost — OK en dev, pas en production.\n")
}
if (appUrl && authUrl && appUrl !== authUrl) {
  console.log("⚠️  NEXT_PUBLIC_APP_URL et NEXTAUTH_URL devraient être identiques (même origine).")
  console.log("    APP :", appUrl)
  console.log("    AUTH:", authUrl, "\n")
}
if (!process.env.CRON_SECRET) {
  console.log("⚠️  CRON_SECRET vide — les crons /api/cron/* refuseront les appels (sécurité). À définir sur Vercel.\n")
}
if (!process.env.YOUSIGN_WEBHOOK_SECRET && process.env.YOUSIGN_API_KEY) {
  console.log("⚠️  YOUSIGN_WEBHOOK_SECRET vide — recommandé si vous utilisez encore les webhooks Yousign.\n")
}
