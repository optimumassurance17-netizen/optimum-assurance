#!/usr/bin/env node
/**
 * Audit structurel de .env / .env.local (présence des clés, pas de placeholders évidents).
 * N’affiche jamais les valeurs secrètes.
 */
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

const root = process.cwd()

function parseEnvFile(name) {
  const p = resolve(root, name)
  if (!existsSync(p)) return { path: name, missing: true, entries: [] }
  const text = readFileSync(p, "utf-8")
  const entries = []
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq === -1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    entries.push({ key, val })
  }
  return { path: name, missing: false, entries }
}

function auditEntry(key, val) {
  if (!val) return { key, ok: false, reason: "valeur vide" }
  if (key === "DATABASE_URL") {
    if (!/^postgres(ql)?:\/\//i.test(val)) return { key, ok: false, reason: "doit commencer par postgresql:// ou postgres://" }
    if (/HOST|NOM_BASE/i.test(val) && val.length < 80) return { key, ok: false, reason: "semble être un placeholder (HOST/NOM_BASE)" }
  }
  if (/^changez-moi|^changeme$/i.test(val.trim())) return { key, ok: false, reason: "mot de passe / secret par défaut à remplacer" }
  if (key === "NEXTAUTH_SECRET" && val.length < 32) return { key, ok: false, reason: "NEXTAUTH_SECRET trop court (viser ≥ 32 caractères)" }
  return { key, ok: true }
}

console.log("\n🔎 Audit .env / .env.local (sans afficher les secrets)\n")

for (const file of [".env", ".env.local"]) {
  const parsed = parseEnvFile(file)
  if (parsed.missing) {
    console.log(`— ${file} : absent`)
    continue
  }
  console.log(`— ${file} : ${parsed.entries.length} variable(s) définie(s)`)
  const bad = []
  for (const { key, val } of parsed.entries) {
    const a = auditEntry(key, val)
    if (!a.ok) bad.push(a)
  }
  if (bad.length === 0) {
    console.log("  ✅ Aucun problème structurel détecté sur ces entrées.")
  } else {
    for (const b of bad) {
      console.log(`  ❌ ${b.key} : ${b.reason}`)
    }
  }
}

console.log("")
