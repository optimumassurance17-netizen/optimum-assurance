#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

const ROOT = process.cwd()
const SCAN_DIRS = ["app", "components"]
const SCAN_EXTENSIONS = new Set([".ts", ".tsx"])

async function collectSourceFiles(relativeDir) {
  const absoluteDir = path.join(ROOT, relativeDir)
  const entries = await readdir(absoluteDir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name.startsWith(".")) {
      continue
    }
    if (entry.isDirectory()) {
      const nested = await collectSourceFiles(path.join(relativeDir, entry.name))
      files.push(...nested)
      continue
    }
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name)
    if (!SCAN_EXTENSIONS.has(ext) || entry.name.endsWith(".d.ts")) continue
    files.push(path.join(relativeDir, entry.name))
  }

  return files
}

const clientFiles = (
  await Promise.all(
    SCAN_DIRS.map(async (dir) => {
      try {
        return await collectSourceFiles(dir)
      } catch {
        return []
      }
    })
  )
).flat()

const FORBIDDEN_IMPORTS = [
  "@/lib/prisma",
  "@/lib/prisma-client",
  "@/lib/generated/prisma",
  "@/lib/mollie-sepa",
]

const failures = []

for (const file of clientFiles) {
  const source = await readFile(file, "utf8")
  const trimmed = source.trimStart()
  if (!trimmed.startsWith('"use client"') && !trimmed.startsWith("'use client'")) {
    continue
  }

  for (const forbidden of FORBIDDEN_IMPORTS) {
    const importPattern = new RegExp(`from\\s+["']${forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`)
    if (importPattern.test(source)) {
      failures.push(`${file} -> import interdit: ${forbidden}`)
    }
  }
}

if (failures.length > 0) {
  console.error("Vérification client/serveur échouée :")
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log("Vérification client/serveur OK")
