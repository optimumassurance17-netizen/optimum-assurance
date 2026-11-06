import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import {
  calendarDaysUntil,
  echeanceReminderIsDue,
  factureEcheanceNumero,
  parisCalendarDay,
} from "../lib/echeance-reminder"
import { lateInvoiceAlertMessage } from "../lib/late-invoice-alert-copy"
import { renderFactureEcheancePdf } from "../lib/facture-echeance-pdf"

function atParisNoon(day: string): Date {
  return new Date(`${day}T10:00:00.000Z`)
}

const today = atParisNoon("2026-10-22")
const inTenDays = atParisNoon("2026-11-01")
const inSevenDays = atParisNoon("2026-10-29")
const inElevenDays = atParisNoon("2026-11-02")
const inSixDays = atParisNoon("2026-10-28")

assert.equal(parisCalendarDay(inTenDays), "2026-11-01")
assert.equal(calendarDaysUntil(inTenDays, today), 10)
assert.equal(echeanceReminderIsDue(inTenDays, today), true)
assert.equal(echeanceReminderIsDue(inSevenDays, today), true)
assert.equal(echeanceReminderIsDue(inElevenDays, today), false)
assert.equal(echeanceReminderIsDue(inSixDays, today), false)
assert.equal(factureEcheanceNumero("csub_12345678", inTenDays), "FAC-ECH-20261101-12345678")

const late = lateInvoiceAlertMessage(
  [
    {
      userId: "user_1",
      clientLabel: "Atelier RC",
      label: "Échéance 2",
      amount: 450,
      dueDate: "2026-10-01T00:00:00.000Z",
    },
  ],
  "https://www.optimum-assurance.fr"
)
assert.equal(late.subject, "[Optimum] 1 facture en retard")
assert.match(late.text, /Atelier RC/)
assert.match(late.text, /450/)
assert.match(late.text, /\/gestion\/clients\/user_1/)
assert.doesNotMatch(late.text, /espace-client/)

async function main() {
  const pdf = await renderFactureEcheancePdf({
    numero: "FAC-ECH-20261101-12345678",
    raisonSociale: "SCI Gokse",
    email: "contact@example.com",
    label: "Échéance 2",
    amount: 450,
    echeanceLe: "1 novembre 2026",
  })
  assert.ok(pdf.byteLength > 1000, "la facture PDF est générée")
}

main()
  .then(() => {
    const route = readFileSync("app/api/cron/relance-echeance-10-jours/route.ts", "utf8")
    const vercel = readFileSync("vercel.json", "utf8")
    const email = readFileSync("lib/email.ts", "utf8")
    assert.equal(route.includes("requireManualReminderDispatch"), false)
    assert.ok(route.includes("renderFactureEcheancePdf"), "le cron joint la facture")
    assert.ok(route.includes("relanceEcheanceDixJours"), "le cron envoie l'e-mail d'échéance")
    assert.ok(route.includes("sendLateInvoiceOwnerAlert"), "le cron prévient aussi des factures en retard")
    assert.ok(route.includes("decennaleInstallmentReminder"), "le cron ne relance pas une échéance déjà payée")
    const lateAlert = readFileSync("lib/late-invoice-alert.ts", "utf8")
    assert.ok(lateAlert.includes("getOwnerAlertEmail"), "la facture en retard part sur une seule adresse")
    assert.equal(lateAlert.includes("to: email"), false)
    assert.ok(route.includes('status: { in: ["active", "pending_mandate"] }'), "seuls les prélèvements actifs sont relancés")
    assert.ok(vercel.includes("/api/cron/relance-echeance-10-jours"), "le cron est planifié")
    assert.ok(email.includes("relanceEcheanceDixJours"), "le modèle d'e-mail existe")
    assert.ok(email.includes("La facture"), "l'e-mail annonce la facture jointe")
    console.log("Relance d'échéance à 10 jours : vérifications OK")
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
