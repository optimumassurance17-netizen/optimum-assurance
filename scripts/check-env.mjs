#!/usr/bin/env node
/**
 * Vérifie la configuration des variables d'environnement
 * Usage: node scripts/check-env.mjs (charge .env via dotenv si dispo)
 */
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

const root = resolve(process.cwd())
const envPath = resolve(root, ".env")

// Charger .env manuellement (pas de dépendance dotenv)
if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf-8")
  for (const line of content.split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (m) {
      const val = m[2].replace(/^["']|["']$/g, "").trim()
      if (val && !process.env[m[1]]) process.env[m[1]] = val
    }
  }
}

const vars = [
  { key: "MOLLIE_API_KEY", required: true, hint: "Clé Mollie (test_ ou live_)" },
  { key: "NEXT_PUBLIC_APP_URL", required: true, hint: "URL du site" },
  { key: "DATABASE_URL", required: true, hint: "Connexion base de données" },
  { key: "NEXTAUTH_URL", required: true, hint: "URL NextAuth" },
  { key: "NEXTAUTH_SECRET", required: true, hint: "Secret (npm run generate-secret)" },
  { key: "ADMIN_EMAILS", required: true, hint: "Emails admin CRM" },
  { key: "RESEND_API_KEY", required: true, hint: "Clé Resend (resend.com)" },
  { key: "EMAIL_FROM", required: true, hint: "Email expéditeur" },
  { key: "YOUSIGN_API_KEY", required: true, hint: "Clé Yousign" },
  { key: "YOUSIGN_ENV", required: true, hint: "sandbox ou production" },
  { key: "NEXT_PUBLIC_PHONE", required: false, hint: "Téléphone affiché" },
  { key: "NEXT_PUBLIC_EMAIL", required: false, hint: "Email de contact" },
  { key: "NEXT_PUBLIC_WHATSAPP", required: false, hint: "WhatsApp (sans espaces)" },
  { key: "PAPPERS_API_KEY", required: false, hint: "Optionnel - pré-remplissage SIRET (Pappers)" },
  { key: "INSEE_API_KEY_INTEGRATION", required: false, hint: "Optionnel - pré-remplissage SIRET (INSEE gratuit)" },
  { key: "CRON_SECRET", required: false, hint: "Recommandé - sécurise les crons Vercel (rappels)" },
  { key: "YOUSIGN_WEBHOOK_SECRET", required: false, hint: "Recommandé - vérifie la signature des webhooks YouSign" },
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
