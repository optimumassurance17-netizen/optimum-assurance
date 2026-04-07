#!/usr/bin/env node
/**
 * Crée ou met à jour un utilisateur admin pour les tests Playwright (e2e/gestion.spec.ts).
 *
 * Prérequis : DATABASE_URL, ADMIN_EMAILS (premier email utilisé si E2E_ADMIN_EMAIL absent).
 * Mot de passe : E2E_ADMIN_PASSWORD dans l’environnement au moment du seed, sinon mot de passe
 * de développement par défaut (voir sortie console).
 *
 * Génère .env.e2e (gitignored) avec E2E_ADMIN_EMAIL et E2E_ADMIN_PASSWORD pour Playwright.
 *
 * Usage : npm run e2e:seed-admin
 *         E2E_ADMIN_PASSWORD="VotreMotDePasse" npm run e2e:seed-admin
 */
import { config } from "dotenv"
import { resolve } from "node:path"
import { writeFileSync } from "node:fs"
import bcrypt from "bcryptjs"
import { PrismaClient } from "@prisma/client"

const { hash } = bcrypt

config({ path: resolve(process.cwd(), ".env") })
config({ path: resolve(process.cwd(), ".env.local"), override: true })

const DEFAULT_PASSWORD = "E2eDev_Playwright_2026!"

function firstAdminEmail() {
  const raw = process.env.ADMIN_EMAILS || ""
  const first = raw.split(",")[0]?.trim().toLowerCase()
  return first || null
}

/** Écrit une valeur .env sur une ligne (guillemets si besoin). */
function envLineValue(s) {
  if (/[\s#"']/.test(s)) {
    return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
  }
  return s
}

async function main() {
  const emailRaw = process.env.E2E_ADMIN_EMAIL?.trim().toLowerCase() || firstAdminEmail()
  if (!emailRaw) {
    console.error("Erreur : définissez ADMIN_EMAILS (ou E2E_ADMIN_EMAIL) dans .env.")
    process.exit(1)
  }

  const password = process.env.E2E_ADMIN_PASSWORD?.trim() || DEFAULT_PASSWORD
  const admins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  if (admins.length > 0 && !admins.includes(emailRaw)) {
    console.warn(
      `Attention : "${emailRaw}" n'est pas dans ADMIN_EMAILS — la gestion renverra 403 tant que ce n'est pas corrigé.`
    )
  }

  const prisma = new PrismaClient()
  try {
    const passwordHash = await hash(password, 12)
    await prisma.user.upsert({
      where: { email: emailRaw },
      create: {
        email: emailRaw,
        passwordHash,
        raisonSociale: "Admin E2E Playwright",
      },
      update: {
        passwordHash,
      },
    })
  } finally {
    await prisma.$disconnect()
  }

  const e2ePath = resolve(process.cwd(), ".env.e2e")
  const body = [
    "# Généré par npm run e2e:seed-admin — ne pas committer (déjà ignoré par .env*).",
    `E2E_ADMIN_EMAIL=${envLineValue(emailRaw)}`,
    `E2E_ADMIN_PASSWORD=${envLineValue(password)}`,
    "",
  ].join("\n")
  writeFileSync(e2ePath, body, "utf8")

  console.log("")
  console.log("Compte E2E prêt :", emailRaw)
  if (password === DEFAULT_PASSWORD) {
    console.log("Mot de passe : (défaut dev)", DEFAULT_PASSWORD)
    console.log("Pour un mot de passe perso : E2E_ADMIN_PASSWORD=... npm run e2e:seed-admin")
  } else {
    console.log("Mot de passe : celui fourni dans E2E_ADMIN_PASSWORD.")
  }
  console.log("Fichier créé :", e2ePath)
  console.log("Ensuite : npm run test:e2e")
  console.log("")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
