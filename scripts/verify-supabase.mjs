#!/usr/bin/env node
/**
 * La signature électronique est intégrée à l'application.
 * Ce contrôle ne exige plus les tables sign_requests / signatures.
 * Il signale seulement si Supabase reste joignable pour la GED et les anciens PDF.
 *
 * Usage : npm run verify:supabase
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
loadEnvFile(resolve(root, ".env.vercel.pull"), { override: true })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

console.log("\nSignature électronique : intégrée à l'application, sans Supabase.\n")

if (!url) {
  console.log("○ NEXT_PUBLIC_SUPABASE_URL absent — la GED distante n'est pas configurée.\n")
  process.exit(0)
}

if (!url.startsWith("https://") || !url.includes("supabase.co")) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL semble invalide :", url.slice(0, 48) + "…")
  process.exit(1)
}

if (!serviceKey) {
  console.log("○ SUPABASE_SERVICE_ROLE_KEY absente — la GED distante n'est pas vérifiable.\n")
  process.exit(0)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const gedBucket = process.env.SUPABASE_GED_BUCKET?.trim() || "client_documents"
for (const bucket of [gedBucket, "signed_documents"]) {
  const { error } = await supabase.storage.from(bucket).list("", { limit: 1 })
  if (error) {
    console.log(`○ Bucket « ${bucket} » non vérifié : ${error.message || error}`)
  } else {
    console.log(`✅ Bucket « ${bucket} » accessible`)
  }
}

console.log("\n✅ Contrôle terminé. La signature ne dépend pas de ces buckets.\n")
process.exit(0)
