#!/usr/bin/env node
/**
 * Génère un NEXTAUTH_SECRET sécurisé
 * Usage: node scripts/generate-secret.mjs
 * Ou: npm run generate-secret
 */
import { randomBytes } from "node:crypto"
const secret = randomBytes(32).toString("base64")
console.log("\nNEXTAUTH_SECRET généré (à copier dans .env):\n")
console.log(`NEXTAUTH_SECRET=${secret}\n`)
