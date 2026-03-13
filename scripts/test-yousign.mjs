/**
 * Test de connexion à l'API Yousign Sandbox
 * Exécuter : node scripts/test-yousign.mjs
 */

import { readFileSync } from "fs"
import { resolve } from "path"

// Charger .env
const envPath = resolve(process.cwd(), ".env")
try {
  const env = readFileSync(envPath, "utf8")
  for (const line of env.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, "")
      process.env[key] = value
    }
  }
} catch {
  console.log("Fichier .env non trouvé")
}

const apiKey = process.env.YOUSIGN_API_KEY
const baseUrl = (process.env.YOUSIGN_ENV || "sandbox") === "production"
  ? "https://api.yousign.app/v3"
  : "https://api-sandbox.yousign.app/v3"

async function test() {
  console.log("🔍 Test connexion Yousign Sandbox...\n")

  if (!apiKey) {
    console.error("❌ YOUSIGN_API_KEY non défini dans .env")
    process.exit(1)
  }

  console.log("✓ Clé API trouvée")
  console.log(`✓ URL: ${baseUrl}\n`)

  try {
    // Test: lister les signature requests (GET)
    const res = await fetch(`${baseUrl}/signature_requests?limit=1`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (res.ok) {
      const data = await res.json()
      console.log("✅ Connexion OK ! L'API Yousign répond correctement.")
      console.log(`   (${data.data?.length ?? 0} signature(s) existante(s))\n`)
    } else {
      const err = await res.text()
      console.error("❌ Erreur API:", res.status, err)
      process.exit(1)
    }
  } catch (err) {
    console.error("❌ Erreur:", err.message)
    process.exit(1)
  }
}

test()
