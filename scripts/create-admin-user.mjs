#!/usr/bin/env node
/**
 * Crée ou met à jour un utilisateur (mot de passe) pour se connecter au site et au CRM /gestion.
 * L’accès CRM exige aussi que cet email soit dans ADMIN_EMAILS (Vercel ou .env).
 *
 * Usage :
 *   CREATE_ADMIN_PASSWORD="VotreMotDePasse8+" node scripts/create-admin-user.mjs admin@votredomaine.fr
 *
 * Ou (moins recommandé — historique shell) :
 *   node scripts/create-admin-user.mjs admin@votredomaine.fr "VotreMotDePasse8+"
 *
 * Nécessite DATABASE_URL (ex. .env à la racine).
 */
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { hash } from "bcryptjs"
import { PrismaClient } from "@prisma/client"

const root = resolve(process.cwd())

function loadEnvFile(filePath, { override = false } = {}) {
  if (!existsSync(filePath)) return
  for (const line of readFileSync(filePath, "utf-8").split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (m) {
      const key = m[1]
      const val = m[2].replace(/^["']|["']$/g, "").trim()
      if (val && (override || !process.env[key])) {
        process.env[key] = val
      }
    }
  }
}

loadEnvFile(resolve(root, ".env"))
loadEnvFile(resolve(root, ".env.local"), { override: true })

const emailArg = process.argv[2]
const passwordFromArgv = process.argv[3]
const password = process.env.CREATE_ADMIN_PASSWORD || passwordFromArgv

if (!emailArg || !emailArg.includes("@")) {
  console.error("\n❌ Indiquez un email valide en premier argument.\n")
  console.error(
    "   CREATE_ADMIN_PASSWORD=\"...\" node scripts/create-admin-user.mjs vous@votredomaine.fr\n"
  )
  process.exit(1)
}

if (!password || password.length < 8) {
  console.error("\n❌ Mot de passe requis (min. 8 caractères), via CREATE_ADMIN_PASSWORD ou 2e argument.\n")
  process.exit(1)
}

if (!process.env.DATABASE_URL?.trim()) {
  console.error("\n❌ DATABASE_URL manquant. Ajoutez-la dans .env ou .env.local, ou exportez-la (URL Postgres prod depuis Vercel).\n")
  process.exit(1)
}

const email = emailArg.trim().toLowerCase()
const prisma = new PrismaClient()

try {
  const passwordHash = await hash(password, 12)
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      raisonSociale: "Administrateur",
    },
    update: {
      passwordHash,
    },
  })

  console.log("\n✅ Compte prêt :", user.email)
  console.log("   Connectez-vous sur /connexion puis allez sur /gestion.")
  console.log("   Vérifiez que cet email est bien dans ADMIN_EMAILS sur Vercel.\n")
} catch (e) {
  console.error("\n❌ Erreur :", e.message || e)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
