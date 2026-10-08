import { readFileSync } from "node:fs"
import {
  CARD_LINK_LIFETIME_MS,
  cardLinkDescription,
  cardLinkExpiresAt,
  createCardLinkRef,
  decidePendingChargeLock,
  interpretPaymentLink,
  isPaymentLinkId,
  linkRefFromDescription,
} from "../lib/card-link-lifetime"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const now = new Date("2026-10-08T21:00:00.000Z")
const expiresAt = cardLinkExpiresAt(now)
assert(expiresAt === "2026-10-15T21:00:00+00:00", "le lien expire exactement 7 jours plus tard")
assert(new Date(expiresAt).getTime() - now.getTime() === CARD_LINK_LIFETIME_MS, "la durée est de 7 jours")

const ref = createCardLinkRef(new Uint8Array([0x0a, 0x1b, 0x2c, 0x3d]))
assert(ref === "0a1b2c3d", "la référence du lien est stable")
const description = cardLinkDescription("Échéance 2 — carte — ACME", ref)
assert(description.startsWith("ref 0a1b2c3d — "), "la description porte la référence")
assert(description.length <= 255, "la description reste dans la limite Mollie")
assert(linkRefFromDescription(description) === ref, "la référence se relit depuis la description")
assert(linkRefFromDescription("ref 0a1b2c3d") === ref, "une référence tronquée reste lisible")
assert(linkRefFromDescription("sans référence") === null, "une description ordinaire n'a pas de référence")

const long = cardLinkDescription("x".repeat(400), ref)
assert(long.length === 255 && long.startsWith("ref 0a1b2c3d — "), "une description longue garde la référence")

assert(isPaymentLinkId("pl_abc123"), "un lien Mollie commence par pl_")
assert(!isPaymentLinkId("tr_abc123"), "un paiement Mollie n'est pas un lien")

const open = interpretPaymentLink(
  { paymentUrl: "https://payment-links.mollie.com/payment/abc", expiresAt },
  now
)
assert(open.kind === "open" && open.checkoutUrl.startsWith("https://"), "un lien non échu reste ouvert")
assert(
  interpretPaymentLink({ paidAt: expiresAt, paymentUrl: "https://payment-links.mollie.com/payment/abc" }, now).kind ===
    "paid",
  "un lien payé est payé"
)
assert(
  interpretPaymentLink({ archived: true, paymentUrl: "https://payment-links.mollie.com/payment/abc" }, now).kind ===
    "closed",
  "un lien archivé est fermé"
)
assert(
  interpretPaymentLink(
    { paymentUrl: "https://payment-links.mollie.com/payment/abc", expiresAt: "2026-10-08T20:00:00+00:00" },
    now
  ).kind === "closed",
  "un lien échu est fermé"
)
assert(interpretPaymentLink({}, now).kind === "unknown", "un lien sans adresse n'est pas réutilisé")

assert(decidePendingChargeLock({ kind: "payment-link", linkState: "open" }) === "skip", "un lien ouvert bloque le prélèvement")
assert(decidePendingChargeLock({ kind: "payment-link", linkState: "unreadable" }) === "skip", "un lien illisible ne déclenche pas de débit")
assert(decidePendingChargeLock({ kind: "payment-link", linkState: "paid" }) === "mark-paid", "un lien payé est encaissé")
assert(decidePendingChargeLock({ kind: "payment-link", linkState: "closed" }) === "release", "un lien expiré libère le verrou")
assert(decidePendingChargeLock({ kind: "payment", paymentStatus: "pending" }) === "skip", "un prélèvement ouvert est attendu")
assert(decidePendingChargeLock({ kind: "payment", paymentStatus: "paid" }) === "mark-paid", "un prélèvement payé est encaissé")
assert(decidePendingChargeLock({ kind: "payment", paymentStatus: "failed" }) === "release", "un prélèvement échoué libère le verrou")
assert(decidePendingChargeLock({ kind: "payment", paymentStatus: "missing" }) === "release", "un paiement introuvable libère le verrou")

const cardLink = readFileSync(new URL("../lib/gestion-card-link.ts", import.meta.url), "utf8")
const createPayment = readFileSync(new URL("../app/api/mollie/create-payment/route.ts", import.meta.url), "utf8")
const echeances = readFileSync(new URL("../app/api/gestion/clients/[id]/echeances/route.ts", import.meta.url), "utf8")
const webhook = readFileSync(new URL("../app/api/mollie/webhook/route.ts", import.meta.url), "utf8")
const cron = readFileSync(new URL("../app/api/cron/sepa-trimestriel/route.ts", import.meta.url), "utf8")
const clientEcheance = readFileSync(new URL("../app/api/client/prochaine-echeance/route.ts", import.meta.url), "utf8")
const sepa = readFileSync(new URL("../lib/mollie-sepa.ts", import.meta.url), "utf8")

assert(cardLink.includes("paymentLinks.create"), "le lien carte passe par l'API payment links")
assert(cardLink.includes("expiresAt"), "le lien carte a une date d'expiration")
assert(cardLink.includes("allowedMethods: [PaymentMethod.creditcard]"), "le lien n'accepte que la carte")
assert(cardLink.includes("reusable: false"), "le lien ne sert qu'une fois")
assert(!cardLink.includes("payments.create"), "le lien carte ne crée plus un paiement carte de 30 minutes")
const cardBranch = createPayment.slice(createPayment.indexOf("const isCard"), createPayment.indexOf("const paymentParams"))
assert(cardBranch.includes("createStoredCardPayment"), "le paiement carte client crée un lien de 7 jours")
assert(!cardBranch.includes("payments.create"), "le paiement carte client ne crée pas un paiement de 30 minutes")
assert(!echeances.includes("payments.create"), "la fiche ne crée plus un paiement carte de 30 minutes")
assert(echeances.includes("createStoredCardPayment"), "la fiche crée un lien carte")
assert(webhook.includes("findStoredCardLinkForPayment"), "le webhook retrouve le lien à partir du paiement")
assert(webhook.includes("markStoredCardLinkPaid"), "le webhook clôt le lien une fois payé")
assert(cron.includes("readPendingChargeLock"), "le cron SEPA reconnaît un lien carte encore ouvert")
assert(!clientEcheance.includes("payments.create") && !clientEcheance.includes("paymentLinks.create"), "l'espace client ne crée pas de lien")
assert(sepa.includes("PaymentMethod.directdebit"), "le prélèvement SEPA reste un débit, pas un lien carte")

console.log("Durée de vie des liens carte : OK")
