import { readFileSync } from "node:fs"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const alert = readFileSync(new URL("../lib/account-creation-alert.ts", import.meta.url), "utf8")
const login = readFileSync(new URL("../lib/client-login-alert.ts", import.meta.url), "utf8")
const operations = readFileSync(new URL("../lib/operations-alert.ts", import.meta.url), "utf8")
const access = readFileSync(new URL("../lib/client-access.ts", import.meta.url), "utf8")
const register = readFileSync(new URL("../app/api/auth/register/route.ts", import.meta.url), "utf8")
const devis = readFileSync(new URL("../lib/devis-alert.ts", import.meta.url), "utf8")
const email = readFileSync(new URL("../lib/email.ts", import.meta.url), "utf8")
const contact = readFileSync(new URL("../lib/public-contact-email.ts", import.meta.url), "utf8")
const receipt = readFileSync(new URL("../lib/echeance-receipt.ts", import.meta.url), "utf8")
const webhook = readFileSync(new URL("../app/api/mollie/webhook/route.ts", import.meta.url), "utf8")

assert(
  alert.includes('export const ACCOUNT_CREATION_INBOX = DEFAULT_PUBLIC_CONTACT_EMAIL'),
  "la boîte de création de compte est l'adresse publique info@"
)
assert(alert.includes("to: ACCOUNT_CREATION_INBOX"), "la copie du mail de création part sur info@")
assert(alert.includes("Alerte automatique désactivée"), "l'alerte nouveau compte est désactivée")
assert(alert.includes("export async function sendAccountCreationMailCopy"), "la copie du mail de création existe")
assert(login.includes("Alerte automatique désactivée"), "l'alerte de connexion est désactivée")
assert(!login.includes("sendEmail"), "l'alerte de connexion n'envoie plus d'email")
assert(operations.includes("Alerte automatique désactivée"), "l'alerte interne des crons est désactivée")
assert(!operations.includes("sendEmail"), "les crons n'envoient plus de mail interne")
assert(access.includes("sendAccountCreationMailCopy"), "le mail d'accès créé est copié sur info@")
assert(register.includes("sendAccountCreationMailCopy"), "le mail de bienvenue est copié sur info@")
assert(
  devis.includes("return [getOwnerAlertEmail()]"),
  "l'alerte interne part sur une seule adresse"
)
assert(
  devis.includes("return DEFAULT_PUBLIC_CONTACT_EMAIL"),
  "sans adresse personnelle, l'alerte reste sur info@"
)
assert(devis.includes("void params"), "l'enregistrement d'un questionnaire n'envoie plus d'alerte")
assert(
  email.includes("const replyTo = DEFAULT_PUBLIC_CONTACT_EMAIL"),
  "toute réponse revient sur info@"
)
assert(
  contact.includes("return DEFAULT_PUBLIC_CONTACT_EMAIL"),
  "le formulaire de contact arrive sur info@"
)
assert(email.includes("confirmationEcheancePayee"), "le reçu d'échéance existe")
assert(receipt.includes("shouldCopyEcheanceReceipt"), "la copie du reçu part sur info@ seulement si le client est ailleurs")
assert(receipt.includes("[Copie]"), "la copie du reçu est identifiée")
assert(
  webhook.includes('metadata.type === "echeance_carte" || metadata.type === "sepa_trimestre"'),
  "le reçu part à l'encaissement carte ou SEPA"
)
assert(webhook.includes("!alreadyProcessed"), "un webhook déjà traité ne renvoie pas le reçu")

console.log("Boîte création de compte : OK")
