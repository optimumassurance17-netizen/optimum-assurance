import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { DemandesDocumentClient } from "@/components/espace-client/DemandesDocumentClient"
import { describePendingDoQuote } from "@/lib/do-quote-pending"
import { readStoredDocumentRequest, withDocumentRequestDeposit } from "@/lib/document-request"

const hidden = describePendingDoQuote({
  hasDoContract: true,
  initialJson: JSON.stringify({ coutTotal: 200000, adresseConstruction: "12 rue du Chantier", villeConstruction: "Lyon" }),
})
assert.equal(hidden, null)

const pending = describePendingDoQuote({
  hasDoContract: false,
  initialJson: JSON.stringify({
    coutTotal: 200000,
    adresseConstruction: "12 rue du Chantier",
    codePostalConstruction: "69001",
    villeConstruction: "Lyon",
  }),
})
assert.ok(pending)
assert.equal(pending?.constructionCost, 200000)
assert.equal(pending?.indicativePremium != null && pending.indicativePremium > 0, true)
assert.match(pending?.chantier ?? "", /12 rue du Chantier/)
assert.match(pending?.chantier ?? "", /Lyon/)

const absent = describePendingDoQuote({ hasDoContract: false })
assert.equal(absent, null)

const details = JSON.stringify({
  message: "Merci d'envoyer le permis de construire.",
  assuranceLabel: "Dommages-ouvrage OPT-DO-1",
  sentTo: "client@example.com",
})
const next = withDocumentRequestDeposit(details, {
  filename: "permis.pdf",
  depositedAt: "2026-10-11T18:30:00.000Z",
  userDocumentId: "doc-1",
})
assert.ok(next)
const stored = readStoredDocumentRequest({
  id: "log-9",
  adminEmail: "info@optimum-assurance.eu",
  createdAt: "2026-10-11T18:00:00.000Z",
  details: next!,
})
assert.equal(stored?.depositedFilename, "permis.pdf")
assert.match(stored?.message ?? "", /permis de construire/)

const fiche = readFileSync("app/gestion/clients/[id]/page.tsx", "utf8")
assert.match(fiche, /Devis DO à préparer/)
assert.match(fiche, /Prime indicative/)
assert.match(fiche, /Pièce déposée/)

const dashboard = readFileSync("app/gestion/page.tsx", "utf8")
assert.match(dashboard, /Prime indicative/)
assert.match(dashboard, /disabled=\{!devisDoForm\.userId\}/)
assert.match(dashboard, /disabled=\{!matchingUser\}/)
assert.match(dashboard, /Le formulaire DO reste bloqué sans fiche/)

const createRoute = readFileSync("app/api/gestion/contracts/do/create/route.ts", "utf8")
assert.match(createRoute, /Client requis/)

const clientRoute = readFileSync("app/api/client/demandes-document/route.ts", "utf8")
assert.match(clientRoute, /session\.user\.id/)
assert.match(clientRoute, /targetId: session\.user\.id/)
assert.doesNotMatch(clientRoute, /payments\.create|paymentLinks\.create|createSignRequest/)
assert.match(clientRoute, /ne confirme pas que le dossier est garanti/)

const page = readFileSync("app/espace-client/page.tsx", "utf8")
assert.match(page, /DemandesDocumentClient/)

const html = renderToStaticMarkup(
  createElement(DemandesDocumentClient, {
    initialRequests: [
      {
        id: "log-9",
        message: "Merci d'envoyer le permis de construire.",
        assuranceLabel: "Dommages-ouvrage OPT-DO-1",
        createdAt: "2026-10-11T18:00:00.000Z",
        depositedFilename: null,
        depositedAt: null,
      },
    ],
  })
)
assert.match(html, /Documents demandés/)
assert.match(html, /permis de construire/)
assert.match(html, /Déposer la pièce/)
assert.match(html, /ne confirme pas que le dossier est garanti/)

console.log("verify-gestion-problemes: ok")
