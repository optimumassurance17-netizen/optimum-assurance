#!/usr/bin/env node
/**
 * Crée les tables en prod (prisma db push) avec DATABASE_URL de Vercel.
 * Prérequis : avoir créé une base Postgres sur Vercel (Storage ou Marketplace Neon).
 *
 * Usage: npm run vercel:db-push
 */
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { execSync } from "node:child_process"

const root = resolve(process.cwd())
const envPath = resolve(root, ".env.vercel")

async function main() {
  // 1. Récupérer les variables depuis Vercel
  console.log("📥 Récupération des variables Vercel...")
  execSync("npx vercel env pull .env.vercel --environment=production --yes", {
    stdio: "inherit",
  })

  if (!existsSync(envPath)) {
    console.error("❌ Fichier .env.vercel introuvable après le pull.")
    process.exit(1)
  }

  const content = readFileSync(envPath, "utf-8")
  let databaseUrl = null
  for (const line of content.split("\n")) {
    const m = line.match(/^DATABASE_URL=(.+)$/)
    if (m) {
      databaseUrl = m[1].replace(/^["']|["']$/g, "").trim()
      break
    }
  }

  if (!databaseUrl) {
    console.error("❌ DATABASE_URL absente. Crée d'abord la base Postgres :")
    console.error("   → vercel.com → ton projet → Storage → Create Database → Postgres")
    console.error("   → ou Marketplace → Neon → Install")
    process.exit(1)
  }

  console.log("📤 Création des tables (prisma db push)...")
  execSync("npx prisma db push", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  })
  console.log("✅ Tables créées.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
