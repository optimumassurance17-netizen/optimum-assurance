import fs from "node:fs/promises"
import path from "node:path"

function pad(value) {
  return String(value).padStart(2, "0")
}

function buildTimestamp(now = new Date()) {
  return [
    now.getUTCFullYear(),
    pad(now.getUTCMonth() + 1),
    pad(now.getUTCDate()),
    pad(now.getUTCHours()),
    pad(now.getUTCMinutes()),
    pad(now.getUTCSeconds()),
  ].join("")
}

function toSlug(input) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

async function main() {
  const rawName = process.argv.slice(2).join(" ").trim()
  const suffix = toSlug(rawName || "integration-touch") || "integration-touch"
  const timestamp = buildTimestamp()
  const fileName = `${timestamp}_${suffix}.sql`
  const migrationsDir = path.join(process.cwd(), "supabase", "migrations")
  const outPath = path.join(migrationsDir, fileName)

  await fs.mkdir(migrationsDir, { recursive: true })
  const sql = `-- No-op migration\n-- Purpose: trigger Supabase extraction when no schema SQL changed yet.\n-- Created at: ${new Date().toISOString()}\n`
  await fs.writeFile(outPath, sql, { encoding: "utf8", flag: "wx" })

  console.log(`✅ Migration créée: supabase/migrations/${fileName}`)
}

main().catch((error) => {
  console.error("❌ Impossible de créer la migration no-op Supabase.")
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
