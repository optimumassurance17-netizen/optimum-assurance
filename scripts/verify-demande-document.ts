import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { DocumentRequestButton } from "@/components/gestion/DocumentRequestButton"
import { describeClientActivity } from "@/lib/admin-activity-label"
import {
  buildDocumentRequestEmail,
  documentRequestActivityLabel,
  documentRequestScope,
  documentTypeAssuranceLabel,
  parseDocumentRequestMessage,
  readStoredDocumentRequest,
} from "@/lib/document-request"

const short = parseDocumentRequestMessage("  trop  ")
assert.equal(short.ok, false)

const empty = parseDocumentRequestMessage(12)
assert.equal(empty.ok, false)

const long = parseDocumentRequestMessage("a".repeat(2001))
assert.equal(long.ok, false)

const parsed = parseDocumentRequestMessage("  Merci d'envoyer le KBIS à jour.  ")
assert.equal(parsed.ok, true)
if (!parsed.ok) throw new Error("message attendu")

const dossier = documentRequestScope({})
assert.equal(dossier.assuranceLabel, "Dossier client")
assert.match(dossier.scopePhrase, /votre dossier/)
assert.doesNotMatch(dossier.subject, /vercel\.app/)

const assurance = documentRequestScope({
  productLabel: "Dommages-ouvrage",
  reference: "OPT-DO-2026-0004",
})
assert.match(assurance.scopePhrase, /Dommages-ouvrage/)
assert.match(assurance.scopePhrase, /OPT-DO-2026-0004/)
assert.match(assurance.subject, /OPT-DO-2026-0004/)

assert.equal(documentTypeAssuranceLabel("attestation"), "attestation décennale")
assert.equal(documentTypeAssuranceLabel("inconnu"), "document")

const email = buildDocumentRequestEmail({
  clientLabel: "SCA La Colline",
  message: "Envoyez le permis de construire <script>alert(1)</script>.",
  scopePhrase: assurance.scopePhrase,
  subject: assurance.subject,
  espaceClientUrl: "https://www.optimum-assurance.fr/espace-client",
})
assert.match(email.text, /permis de construire/)
assert.match(email.text, /ne confirme pas que le dossier est garanti/)
assert.match(email.text, /https:\/\/www\.optimum-assurance\.fr\/espace-client/)
assert.match(email.html, /&lt;script&gt;/)
assert.doesNotMatch(email.html, /<script>/)
assert.doesNotMatch(email.text, /garantie accordée|paiement accepté|checkout/)
assert.doesNotMatch(`${email.text}\n${email.html}`, /payments\.create|paymentLinks/)

const stored = readStoredDocumentRequest({
  id: "log-1",
  adminEmail: "info@optimum-assurance.eu",
  createdAt: "2026-10-11T18:00:00.000Z",
  details: JSON.stringify({
    message: parsed.message,
    sentTo: "client@example.com",
    assuranceLabel: assurance.assuranceLabel,
  }),
})
assert.equal(stored?.sentTo, "client@example.com")
assert.match(stored?.assuranceLabel ?? "", /OPT-DO-2026-0004/)
assert.equal(readStoredDocumentRequest({
  id: "log-2",
  adminEmail: "admin",
  createdAt: "2026-10-11T18:00:00.000Z",
  details: "{",
}), null)

const label = documentRequestActivityLabel(JSON.stringify({
  message: "Merci d'envoyer le KBIS à jour.",
  assuranceLabel: "Dossier client",
  sentTo: "client@example.com",
}))
assert.match(label, /Demande de document envoyée/)
assert.match(label, /KBIS/)

const activity = describeClientActivity([
  {
    id: "log-3",
    action: "document_request_sent",
    adminEmail: "info@optimum-assurance.eu",
    createdAt: "2026-10-11T18:00:00.000Z",
    details: JSON.stringify({
      message: "Merci d'envoyer l'attestation décennale du lot gros œuvre.",
      assuranceLabel: "Décennale OPT-DEC-1",
      sentTo: "client@example.com",
    }),
  },
])
assert.match(activity[0]?.actionLabel ?? "", /Décennale OPT-DEC-1/)
assert.match(activity[0]?.actionLabel ?? "", /attestation décennale/)

const route = readFileSync("app/api/gestion/demande-document/route.ts", "utf8")
assert.match(route, /isAdmin\(session\)/)
assert.match(route, /emailNotSentBody\(\)/)
assert.ok(route.indexOf("emailNotSentBody()") < route.indexOf("adminActivityLog.create"))
assert.match(route, /targets\.length !== 1/)
assert.match(route, /SITE_URL/)
assert.match(route, /logContractAction/)
assert.doesNotMatch(route, /payments\.create|paymentLinks\.create|createSignRequest|sepa-trimestriel/)
assert.doesNotMatch(route, /replyTo:/)

const fiche = readFileSync("app/gestion/clients/[id]/page.tsx", "utf8")
assert.match(fiche, /Demander un document/)
assert.match(fiche, /id="demande-document"/)
assert.match(fiche, /variant="card"/)
assert.match(fiche, /userId=\{clientId\}/)
assert.match(fiche, /insuranceContractId=\{contract\.id\}/)
assert.match(fiche, /documentId=\{d\.id\}/)
assert.match(fiche, /ne confirme pas la garantie/)

const dashboard = readFileSync("app/gestion/page.tsx", "utf8")
assert.match(dashboard, /userId=\{u\.id\}/)
assert.match(dashboard, /documentId=\{d\.id\}/)

const contracts = readFileSync("components/gestion/InsuranceContractsGestionBlock.tsx", "utf8")
assert.match(contracts, /insuranceContractId=\{c\.id\}/)
assert.match(contracts, /Demander documents DO/)

const button = readFileSync("components/gestion/DocumentRequestButton.tsx", "utf8")
assert.match(button, /\/api\/gestion\/demande-document/)
assert.match(button, /Envoyer la demande/)
assert.doesNotMatch(button, /payments\.create/)
const fetchAt = button.indexOf("fetch(")
const submitAt = button.indexOf("async function submit")
assert.ok(submitAt >= 0 && fetchAt > submitAt)

const cardHtml = renderToStaticMarkup(
  createElement(DocumentRequestButton, { variant: "card", userId: "client-1" })
)
assert.match(cardHtml, /Demander un document/)
assert.match(cardHtml, /Message au client/)
assert.match(cardHtml, /Indiquez le document à transmettre/)

const compactHtml = renderToStaticMarkup(
  createElement(DocumentRequestButton, { insuranceContractId: "contract-1" })
)
assert.match(compactHtml, /Demander un document/)
assert.doesNotMatch(compactHtml, /<textarea/)

console.log("verify-demande-document: ok")
