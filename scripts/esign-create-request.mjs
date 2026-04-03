#!/usr/bin/env node
/**
 * Upload un PDF dans le bucket Supabase "documents" et crée une ligne sign_requests.
 * Usage : node scripts/esign-create-request.mjs chemin/vers/fichier.pdf [dossier/optionnel/]
 *
 * Prérequis : .env ou .env.local avec NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *             + SQL supabase-esign-mvp.sql et supabase-esign-storage.sql exécutés.
 */
import { createClient } from "@supabase/supabase-js"
import { readFileSync, existsSync } from "node:fs"
import { basename, resolve } from "node:path"
import { randomUUID } from "node:crypto"

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
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const pdfPath = process.argv[2]
const prefix = (process.argv[3] ?? "uploads").replace(/^\/+|\/+$/g, "")

if (!url || !key) {
  console.error("Définir NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.")
  process.exit(1)
}
if (!pdfPath || !existsSync(pdfPath)) {
  console.error("Usage: node scripts/esign-create-request.mjs <fichier.pdf> [préfixe-dossier]")
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

const fileName = basename(pdfPath)
const storagePath = `${prefix}/${randomUUID()}-${fileName}`

const buf = readFileSync(pdfPath)
const { error: upErr } = await supabase.storage.from("documents").upload(storagePath, buf, {
  contentType: "application/pdf",
  upsert: false,
})

if (upErr) {
  console.error("Upload Storage:", upErr.message)
  process.exit(1)
}

const { data: inserted, error: insErr } = await supabase
  .from("sign_requests")
  .insert({ document_storage_path: storagePath })
  .select("id")
  .single()

if (insErr || !inserted?.id) {
  console.error("Insert sign_requests:", insErr?.message ?? "unknown")
  process.exit(1)
}

const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")
console.log("Demande créée.")
console.log("ID :", inserted.id)
console.log("Chemin Storage :", storagePath)
console.log("URL de signature :", `${appUrl}/sign/${inserted.id}`)
