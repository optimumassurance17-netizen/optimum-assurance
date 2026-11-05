import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import {
  QUOTE_EXPIRED_ERROR,
  QUOTE_VALIDITY_DAYS,
  QUOTE_VALIDITY_MS,
  isDisplayedQuoteExpired,
  isQuoteExpired,
  quoteExpiresAt,
  quoteStillValidSince,
} from "@/lib/quote-validity"
import { describeClientSignature } from "@/lib/signature-reminder"

assert.equal(QUOTE_VALIDITY_DAYS, 60)
assert.equal(QUOTE_VALIDITY_MS, 60 * 24 * 60 * 60 * 1000)

const issued = new Date("2026-01-01T12:00:00.000Z")
const expires = quoteExpiresAt(issued)
assert.equal(expires.toISOString(), "2026-03-02T12:00:00.000Z")
assert.equal(isQuoteExpired(issued, new Date(expires.getTime() - 1)), false)
assert.equal(isQuoteExpired(issued, expires), true)
assert.equal(isQuoteExpired("pas-une-date", issued), true)
assert.equal(isDisplayedQuoteExpired(null, expires), false)
assert.equal(isDisplayedQuoteExpired("", expires), false)
assert.equal(isDisplayedQuoteExpired(undefined, expires), false)
assert.equal(isDisplayedQuoteExpired(issued, new Date(expires.getTime() - 1)), false)
assert.equal(isDisplayedQuoteExpired(issued, expires), true)
assert.equal(quoteStillValidSince(expires).toISOString(), issued.toISOString())
assert.match(QUOTE_EXPIRED_ERROR, /60 jours/)

const freshSignature = describeClientSignature({
  documents: [],
  insuranceContracts: [],
  pending: [
    {
      signatureRequestId: "req-fresh",
      contractNumero: "DEV-1",
      contractData: "{}",
      createdAt: issued,
    },
  ],
  now: new Date(issued.getTime() + 60_000),
})
assert.equal(freshSignature.pending[0]?.expired, false)
const expiredSignature = describeClientSignature({
  documents: [],
  insuranceContracts: [],
  pending: [
    {
      signatureRequestId: "req-old",
      contractNumero: "DEV-1",
      contractData: "{}",
      createdAt: issued,
    },
  ],
  now: expires,
})
assert.equal(expiredSignature.pending[0]?.expired, true)

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")

const decQuote = read("lib/pdf/decennale/generateQuote.ts")
const decBundle = read("lib/pdf/decennale/generateQuotePolicyBundle.ts")
const rcQuote = read("lib/pdf/rc-fabriquant/generateDossier.ts")
const email = read("lib/email.ts")
const draft = read("app/api/devis/send-email/route.ts")
const remise = read("app/api/gestion/etude/remise/route.ts")
const payment = read("app/api/documents/[id]/create-payment/route.ts")
const fromDevis = read("app/api/gestion/sign/send-from-devis/route.ts")
const sign = read("app/api/sign/route.ts")
const card = read("lib/card-link-lifetime.ts")
const titre = read("lib/pdf/assurance-titre/generateDossier.ts")
const doWindow = read("lib/devis-do-lead.ts")

assert.match(decQuote, /from "@\/lib\/quote-validity"/)
assert.doesNotMatch(decQuote, /valable 30 jours/)
assert.match(decBundle, /QUOTE_VALIDITY_DAYS/)
assert.doesNotMatch(decBundle, /QUOTE_VALIDITY_DAYS = 30/)
assert.match(rcQuote, /QUOTE_VALIDITY_DAYS/)
assert.doesNotMatch(rcQuote, /const QUOTE_VALIDITY_DAYS = 30/)
assert.match(draft, /quoteExpiresAt/)
assert.doesNotMatch(draft, /DRAFT_EXPIRY_DAYS/)
assert.match(remise, /quoteExpiresAt/)
assert.match(payment, /isQuoteExpired/)
assert.match(fromDevis, /isQuoteExpired/)
assert.match(sign, /QUOTE_EXPIRED_ERROR/)
assert.match(email, /Ce lien est valable \$\{QUOTE_VALIDITY_DAYS\} jours/)
assert.match(email, /valable 7 jours/)
assert.match(email, /valable 1 heure/)
assert.match(card, /7 \* 24 \* 60 \* 60 \* 1000|CARD_LINK_LIFETIME/)
assert.match(titre, /Validité initiale/)
assert.match(doWindow, /7/)

const dashboard = read("app/api/gestion/dashboard/route.ts")
const gestion = read("app/gestion/page.tsx")
const fiche = read("app/gestion/clients/[id]/page.tsx")
const rectification = read("app/gestion/rectification/page.tsx")
assert.match(dashboard, /isDisplayedQuoteExpired\(p\.createdAt, now\)\) continue/)
assert.match(dashboard, /isDisplayedQuoteExpired\(d\.createdAt, now\)\) continue/)
assert.match(dashboard, /repairEligible: ageHours >= 24 && !expired/)
assert.match(gestion, /expired \? null : \(/)
assert.match(gestion, /Expirée/)
assert.doesNotMatch(gestion, /s\.repairEligible \?/)
const gestionDocument = read("app/gestion/documents/[id]/page.tsx")
assert.match(
  gestionDocument,
  /document\.type === "devis" \|\| document\.type === "devis_do"/
)
assert.match(gestionDocument, /QUOTE_EXPIRED_ERROR/)
assert.match(fiche, /QUOTE_EXPIRED_ERROR/)
assert.match(fiche, /quoteExpired \? "Expiré"/)
assert.match(fiche, /Relancer la signature/)
assert.match(rectification, /isDisplayedQuoteExpired\(s\.createdAt\)/)
assert.match(doWindow, /DO_DEVIS_ACTION_WINDOW_MS/)

console.log("OK: validité des devis fixée à 60 jours, liens carte et couverture inchangés.")
