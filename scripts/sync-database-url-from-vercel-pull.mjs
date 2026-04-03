#!/usr/bin/env node
/**
 * Copie DATABASE_URL depuis .env.vercel.pull vers .env (même clé, une seule ligne).
 * N’affiche pas l’URL. Prérequis : npx vercel env pull .env.vercel.pull --environment production --yes
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

const root = resolve(process.cwd())
const pullPath = resolve(root, ".env.vercel.pull")
const envPath = resolve(root, ".env")

if (!existsSync(pullPath)) {
  console.error("Manque .env.vercel.pull — lance : npx vercel env pull .env.vercel.pull --environment production --yes")
  process.exit(1)
}

const pull = readFileSync(pullPath, "utf-8")
let databaseUrl = ""
for (const line of pull.split("\n")) {
  const m = line.match(/^DATABASE_URL=(.*)$/)
  if (m) {
    databaseUrl = m[1].trim().replace(/^["']|["']$/g, "")
    break
  }
}

if (!databaseUrl.startsWith("postgres")) {
  console.error("DATABASE_URL introuvable ou invalide dans .env.vercel.pull.")
  process.exit(1)
}

if (!existsSync(envPath)) {
  writeFileSync(envPath, `DATABASE_URL="${databaseUrl.replace(/"/g, '\\"')}"\n`, "utf-8")
  console.log("✅ .env créé avec DATABASE_URL (Vercel Production).")
  process.exit(0)
}

let env = readFileSync(envPath, "utf-8")
const lines = env.split(/\r?\n/)
const out = []
let replaced = false
for (const line of lines) {
  if (/^DATABASE_URL=/.test(line)) {
    if (!replaced) {
      out.push(`DATABASE_URL="${databaseUrl.replace(/"/g, '\\"')}"`)
      replaced = true
    }
  } else {
    out.push(line)
  }
}
if (!replaced) {
  out.push(`DATABASE_URL="${databaseUrl.replace(/"/g, '\\"')}"`)
}

writeFileSync(envPath, out.join("\n").replace(/\n+$/, "\n"), "utf-8")
console.log("✅ DATABASE_URL dans .env mise à jour depuis .env.vercel.pull (Production Vercel).")
