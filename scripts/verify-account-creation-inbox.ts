import { readFileSync } from "node:fs"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const alert = readFileSync(new URL("../lib/account-creation-alert.ts", import.meta.url), "utf8")
const login = readFileSync(new URL("../lib/client-login-alert.ts", import.meta.url), "utf8")
const access = readFileSync(new URL("../lib/client-access.ts", import.meta.url), "utf8")
const register = readFileSync(new URL("../app/api/auth/register/route.ts", import.meta.url), "utf8")

assert(
  alert.includes('export const ACCOUNT_CREATION_INBOX = DEFAULT_PUBLIC_CONTACT_EMAIL'),
  "la boîte de création de compte est l'adresse publique info@"
)
assert(alert.includes("to: ACCOUNT_CREATION_INBOX"), "l'alerte nouveau compte part sur info@")
assert(alert.includes("export async function sendAccountCreationMailCopy"), "la copie du mail de création existe")
assert(login.includes("to: ACCOUNT_CREATION_INBOX"), "l'alerte de connexion part sur info@")
assert(access.includes("sendAccountCreationMailCopy"), "le mail d'accès créé est copié sur info@")
assert(register.includes("sendAccountCreationMailCopy"), "le mail de bienvenue est copié sur info@")

console.log("Boîte création de compte : OK")
