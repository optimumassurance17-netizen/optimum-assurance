import { readFileSync } from "node:fs"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const alert = readFileSync(new URL("../lib/account-creation-alert.ts", import.meta.url), "utf8")
const login = readFileSync(new URL("../lib/client-login-alert.ts", import.meta.url), "utf8")
const access = readFileSync(new URL("../lib/client-access.ts", import.meta.url), "utf8")
const register = readFileSync(new URL("../app/api/auth/register/route.ts", import.meta.url), "utf8")
const devis = readFileSync(new URL("../lib/devis-alert.ts", import.meta.url), "utf8")
const email = readFileSync(new URL("../lib/email.ts", import.meta.url), "utf8")
const contact = readFileSync(new URL("../lib/public-contact-email.ts", import.meta.url), "utf8")

assert(
  alert.includes('export const ACCOUNT_CREATION_INBOX = DEFAULT_PUBLIC_CONTACT_EMAIL'),
  "la boîte de création de compte est l'adresse publique info@"
)
assert(alert.includes("to: ACCOUNT_CREATION_INBOX"), "l'alerte nouveau compte part sur info@")
assert(alert.includes("export async function sendAccountCreationMailCopy"), "la copie du mail de création existe")
assert(login.includes("to: ACCOUNT_CREATION_INBOX"), "l'alerte de connexion part sur info@")
assert(access.includes("sendAccountCreationMailCopy"), "le mail d'accès créé est copié sur info@")
assert(register.includes("sendAccountCreationMailCopy"), "le mail de bienvenue est copié sur info@")
assert(
  devis.includes("return [DEFAULT_PUBLIC_CONTACT_EMAIL]"),
  "toutes les alertes internes partent sur info@"
)
assert(
  email.includes("const replyTo = DEFAULT_PUBLIC_CONTACT_EMAIL"),
  "toute réponse revient sur info@"
)
assert(
  contact.includes("return DEFAULT_PUBLIC_CONTACT_EMAIL"),
  "le formulaire de contact arrive sur info@"
)

console.log("Boîte création de compte : OK")
