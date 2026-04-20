import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

const target = path.resolve("lib/generated/prisma/index.js")
const runtimeLibraryTarget = path.resolve("lib/generated/prisma/runtime/library.js")

function patchTurbopackIgnoreForCwd(source) {
  return source.replace(/process\.cwd\(\)/g, (match, offset, full) => {
    const prefix = full.slice(Math.max(0, offset - 40), offset)
    return prefix.includes("turbopackIgnore: true")
      ? match
      : "/* turbopackIgnore: true */ process.cwd()"
  })
}

if (!existsSync(target)) {
  console.warn("[patch-prisma-generated] Fichier introuvable:", target)
  process.exit(0)
}

const original = readFileSync(target, "utf8")

const fallbackBlock = `const fs = require('fs')

config.dirname = __dirname
if (!fs.existsSync(path.join(__dirname, 'schema.prisma'))) {
  const alternativePaths = [
    "lib/generated/prisma",
    "generated/prisma",
  ]
  
  const alternativePath = alternativePaths.find((altPath) => {
    return fs.existsSync(path.join(process.cwd(), altPath, 'schema.prisma'))
  }) ?? alternativePaths[0]

  config.dirname = path.join(process.cwd(), alternativePath)
  config.isBundled = true
}`

let patched = original.replace(fallbackBlock, "config.dirname = __dirname")

patched = patched.replace(
  /\npath\.join\(process\.cwd\(\), "lib\/generated\/prisma\/libquery_engine-[^"]+"\)\n/g,
  "\n"
)
patched = patched.replace(
  /\npath\.join\(process\.cwd\(\), "lib\/generated\/prisma\/schema\.prisma"\)\n/g,
  "\n"
)
patched = patchTurbopackIgnoreForCwd(patched)

let changed = patched !== original

if (changed) {
  writeFileSync(target, patched, "utf8")
}

if (existsSync(runtimeLibraryTarget)) {
  const runtimeOriginal = readFileSync(runtimeLibraryTarget, "utf8")
  const runtimePatched = patchTurbopackIgnoreForCwd(runtimeOriginal)
  if (runtimePatched !== runtimeOriginal) {
    writeFileSync(runtimeLibraryTarget, runtimePatched, "utf8")
    changed = true
  }
}

if (changed) {
  console.log("[patch-prisma-generated] Prisma client patch appliqué.")
} else {
  console.log("[patch-prisma-generated] Aucun patch Prisma à appliquer.")
}
