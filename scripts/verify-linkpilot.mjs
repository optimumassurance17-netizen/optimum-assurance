#!/usr/bin/env node
/**
 * Vérifie la présence des tables LinkPilot AI dans Supabase.
 *
 * Variables attendues :
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage : npm run linkpilot:verify
 */
import { createClient } from "@supabase/supabase-js"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = resolve(process.cwd())

function loadEnvFile(filePath, { override = false } = {}) {
  if (!existsSync(filePath)) return
  const content = readFileSync(filePath, "utf-8")
  for (const line of content.split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!m) continue
    const key = m[1]
    const val = m[2].replace(/^["']|["']$/g, "").trim()
    if (!val) continue
    if (override || !process.env[key]) process.env[key] = val
  }
}

loadEnvFile(resolve(root, ".env"))
loadEnvFile(resolve(root, ".env.local"), { override: true })
loadEnvFile(resolve(root, ".env.vercel.pull"), { override: true })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

console.log("\n🔎 Vérification LinkPilot AI\n")

if (!url || !serviceKey) {
  console.error("❌ Variables manquantes: NEXT_PUBLIC_SUPABASE_URL et/ou SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const checks = [
  ["backlink_prospects", () => supabase.from("backlink_prospects").select("id").limit(1)],
  ["outreach_campaigns", () => supabase.from("outreach_campaigns").select("id").limit(1)],
  ["sent_outreach_emails", () => supabase.from("sent_outreach_emails").select("id").limit(1)],
  ["acquired_backlinks", () => supabase.from("acquired_backlinks").select("id").limit(1)],
  ["toxic_domains", () => supabase.from("toxic_domains").select("id").limit(1)],
]

let failed = false

for (const [name, fn] of checks) {
  const { error } = await fn()
  if (error) {
    failed = true
    console.error(`❌ ${name}: ${error.message}`)
  } else {
    console.log(`✅ ${name}`)
  }
}

if (failed) {
  console.error("\n❌ Vérification LinkPilot incomplète. Appliquez la migration SQL puis relancez.\n")
  process.exit(1)
}

console.log("\n✅ LinkPilot AI prêt côté Supabase.\n")
