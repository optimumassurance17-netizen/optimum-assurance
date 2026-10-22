import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const route = readFileSync("app/api/cron/rappel-dossiers-incomplets/route.ts", "utf8")
const mode = readFileSync("lib/cron-reminder-mode.ts", "utf8")
const echeance = readFileSync("app/api/cron/relance-echeance-10-jours/route.ts", "utf8")
const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as {
  crons: { path: string; schedule: string }[]
}

assert.equal(route.includes("requireManualReminderDispatch"), false)
assert.equal(route.includes("if (manualOnly)"), false)
assert.ok(route.includes("isExplicitReminderSend"))
assert.ok(route.includes('contractDispatch: "automatic"'))
assert.ok(route.includes('signatureDispatch: sendSignatureReminders ? "manual-confirmed" : "held"'))
assert.ok(route.includes("for (const contract of approvedContracts)"))
assert.equal(route.includes("for (const contract of sendSignatureReminders"), false)
assert.ok(route.includes("sendSignatureReminders\n        ? prisma.pendingSignature.findMany"))

const activation = vercel.crons.find((cron) => cron.path.includes("rappel-dossiers-incomplets"))
assert.ok(activation, "le cron d'activation est planifié")
assert.equal(activation.path, "/api/cron/rappel-dossiers-incomplets")
assert.equal(activation.path.includes("send="), false)
assert.equal(activation.schedule, "30 12 * * *")

assert.ok(mode.includes("export function isExplicitReminderSend"))
assert.ok(mode.includes("if (isExplicitReminderSend(request)) return null"))
assert.ok(mode.includes("skippedAutomaticDispatch"))

for (const file of [
  "app/api/cron/rappel-paiements-contrats/route.ts",
  "app/api/cron/rappel-signatures-en-attente/route.ts",
  "app/api/cron/rappel-devis-abandonne/route.ts",
  "app/api/cron/rappels-renouvellement/route.ts",
]) {
  const src = readFileSync(file, "utf8")
  assert.ok(src.includes("requireManualReminderDispatch"), file)
  assert.ok(src.includes("if (manualOnly) return manualOnly"), file)
}

assert.equal(echeance.includes("requireManualReminderDispatch"), false)

console.log("Relance d'activation des contrats signés : vérifications OK")
