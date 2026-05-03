import { readFile, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const prismaGeneratedDir = resolve(__dirname, "../lib/generated/prisma")
const filesToPatch = [
  resolve(prismaGeneratedDir, "index.js"),
  resolve(prismaGeneratedDir, "runtime/library.js"),
]

let patchedCount = 0

for (const filePath of filesToPatch) {
  let source
  try {
    source = await readFile(filePath, "utf8")
  } catch (error) {
    console.warn("[patch-prisma-turbopack] Fichier Prisma introuvable, patch ignoré:", filePath, error.message)
    continue
  }

  const normalized = source.replaceAll("/*turbopackIgnore: true*/ ", "")
  const patched = normalized
    .replaceAll("path.join(process.cwd(),", "path.join(/*turbopackIgnore: true*/ process.cwd(),")
    .replaceAll("path.resolve(process.cwd(),", "path.resolve(/*turbopackIgnore: true*/ process.cwd(),")
    .replaceAll(".relative(process.cwd(),", ".relative(/*turbopackIgnore: true*/ process.cwd(),")
    .replaceAll("es.resolve(process.cwd(),", "es.resolve(/*turbopackIgnore: true*/ process.cwd(),")
    .replaceAll("process.cwd(),", "/*turbopackIgnore: true*/ process.cwd(),")
    .replaceAll("process.cwd())", "/*turbopackIgnore: true*/ process.cwd())")

  if (patched !== source) {
    await writeFile(filePath, patched)
    patchedCount++
  }
}

if (patchedCount > 0) {
  console.log(`[patch-prisma-turbopack] ${patchedCount} fichier(s) Prisma patché(s) pour Turbopack.`)
}
