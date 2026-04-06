#!/usr/bin/env node
/**
 * Génère des secrets forts pour la production (à copier dans Vercel ou .env local).
 * Ne commitez jamais ces valeurs dans le dépôt.
 * Usage: npm run secrets:prod
 */
import { randomBytes } from "node:crypto"

const nextauth = randomBytes(32).toString("base64")
const cron = randomBytes(32).toString("hex")

console.log(`
══════════════════════════════════════════════════════════════
  Secrets générés — copiez-collez dans Vercel → Environment Variables
  (Production) ou dans votre fichier .env local (ne pas committer)
══════════════════════════════════════════════════════════════

NEXTAUTH_SECRET=${nextauth}

CRON_SECRET=${cron}

──────────────────────────────────────────────────────────────
  Rappel : une valeur par variable. Redéployez après enregistrement.
══════════════════════════════════════════════════════════════
`)
