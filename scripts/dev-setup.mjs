#!/usr/bin/env node
/**
 * Configure le projet pour le développement local.
 * À exécuter une fois avant npm run dev.
 */
import { execSync } from "node:child_process"
import { existsSync, copyFileSync } from "node:fs"
import { resolve } from "node:path"

const root = resolve(process.cwd())

console.log("\n🔧 Configuration du projet pour localhost...\n")

// 1. Vérifier .env
if (!existsSync(resolve(root, ".env"))) {
  if (existsSync(resolve(root, ".env.example"))) {
    copyFileSync(resolve(root, ".env.example"), resolve(root, ".env"))
    console.log("✅ .env créé depuis .env.example")
  } else {
    console.log("❌ Créez un fichier .env (voir .env.example)")
    process.exit(1)
  }
} else {
  console.log("✅ .env existe")
}

// 2. Charger et modifier .env
const fs = await import("node:fs")
const envPath = resolve(root, ".env")
let envContent = fs.readFileSync(envPath, "utf-8")
let modified = false

if (!envContent.includes("NEXT_PUBLIC_APP_URL=http://localhost")) {
  envContent = envContent.replace(/NEXT_PUBLIC_APP_URL=.*/, "NEXT_PUBLIC_APP_URL=http://localhost:3000")
  if (!envContent.includes("NEXT_PUBLIC_APP_URL=")) envContent += "\nNEXT_PUBLIC_APP_URL=http://localhost:3000\n"
  envContent = envContent.replace(/NEXTAUTH_URL=.*/, "NEXTAUTH_URL=http://localhost:3000")
  if (!envContent.includes("NEXTAUTH_URL=")) envContent += "\nNEXTAUTH_URL=http://localhost:3000\n"
  modified = true
  console.log("✅ URLs configurées pour localhost:3000")
}

const hasValidSecret = /NEXTAUTH_SECRET=.+/.test(envContent) && !envContent.includes("changez-moi")
if (!hasValidSecret) {
  const secret = "dev-secret-" + Math.random().toString(36).slice(2, 15)
  if (/NEXTAUTH_SECRET=/.test(envContent)) {
    envContent = envContent.replace(/NEXTAUTH_SECRET=.*/, `NEXTAUTH_SECRET=${secret}`)
  } else {
    envContent += `\nNEXTAUTH_SECRET=${secret}\n`
  }
  modified = true
  console.log("✅ NEXTAUTH_SECRET généré pour le dev")
}

if (modified) fs.writeFileSync(envPath, envContent)

// 4. Prisma
try {
  execSync("npx prisma generate", { cwd: root, stdio: "inherit" })
  console.log("✅ Prisma client généré")
} catch (e) {
  console.log("⚠️  Prisma generate a échoué. Fermez le serveur dev et réessayez.")
}

try {
  execSync("npx prisma db push", { cwd: root, stdio: "inherit" })
  console.log("✅ Base de données prête")
} catch (e) {
  console.log("⚠️  Base de données non créée. Vérifiez DATABASE_URL dans .env")
}

console.log("\n✅ Configuration terminée. Lancez: npm run dev\n")
