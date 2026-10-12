import assert from "node:assert/strict"
import { describeClientActivity } from "../lib/admin-activity-label"
import {
  CLIENT_QUOTE_DELETE_ERRORS,
  clientQuoteDeleteRefusal,
  isClientDeletableQuoteDocument,
  jsonFieldEqualsNeedles,
  paymentMetadataBlocksQuote,
} from "../lib/client-quote-delete"

const documentId = "doc_devis_1"
const numero = "DEC-2026-001"

assert.equal(
  paymentMetadataBlocksQuote(
    JSON.stringify({ type: "devis_do", documentId, documentNumero: numero }),
    "paid",
    documentId,
    numero
  ),
  true
)
assert.equal(
  paymentMetadataBlocksQuote(
    JSON.stringify({ type: "devis_do", documentId, documentNumero: numero }),
    "pending",
    documentId,
    numero
  ),
  true
)
assert.equal(
  paymentMetadataBlocksQuote(
    JSON.stringify({ type: "devis_do", documentId }),
    "failed",
    documentId,
    numero
  ),
  false
)
assert.equal(
  paymentMetadataBlocksQuote(
    JSON.stringify({ type: "devis_do", documentNumero: numero }),
    "authorized",
    documentId,
    numero
  ),
  true
)
assert.equal(
  paymentMetadataBlocksQuote(
    JSON.stringify({ type: "echeance_carte", documentNumero: numero }),
    "paid",
    documentId,
    numero
  ),
  false
)
assert.equal(paymentMetadataBlocksQuote("{", "paid", documentId, numero), false)
assert.equal(
  paymentMetadataBlocksQuote(`{"documentId":"${documentId}"}`, "open", documentId, numero),
  true
)

assert.equal(
  clientQuoteDeleteRefusal({
    blockingPayment: false,
    pendingSignature: false,
    linkedContract: false,
    linkedInvoice: false,
    avenantFee: false,
  }),
  null
)
assert.equal(
  clientQuoteDeleteRefusal({
    blockingPayment: true,
    pendingSignature: true,
    linkedContract: false,
    linkedInvoice: false,
    avenantFee: false,
  }),
  CLIENT_QUOTE_DELETE_ERRORS.payment
)
assert.equal(
  clientQuoteDeleteRefusal({
    blockingPayment: false,
    pendingSignature: true,
    linkedContract: true,
    linkedInvoice: false,
    avenantFee: false,
  }),
  CLIENT_QUOTE_DELETE_ERRORS.signature
)
assert.equal(
  clientQuoteDeleteRefusal({
    blockingPayment: false,
    pendingSignature: false,
    linkedContract: true,
    linkedInvoice: true,
    avenantFee: true,
  }),
  CLIENT_QUOTE_DELETE_ERRORS.contract
)

assert.deepEqual(jsonFieldEqualsNeedles("sourceDevisId", documentId), [
  `"sourceDevisId":"${documentId}"`,
  `"sourceDevisId": "${documentId}"`,
])
assert.equal(
  `"sourceDevisNumero":"DEC-10"`.includes(jsonFieldEqualsNeedles("sourceDevisNumero", "DEC-1")[0]),
  false
)

assert.equal(isClientDeletableQuoteDocument({ type: "devis" }), true)
assert.equal(isClientDeletableQuoteDocument({ type: "devis_do" }), true)
assert.equal(isClientDeletableQuoteDocument({ type: "contrat" }), false)
assert.equal(
  isClientDeletableQuoteDocument({ type: "devis_do", generated: true, href: "/api/contracts/c1/pdf/quote" }),
  false
)
assert.equal(isClientDeletableQuoteDocument({ type: "devis", href: "https://example.test/devis.pdf" }), false)

const journal = describeClientActivity([
  {
    id: "log-delete",
    action: "client_quote_deleted",
    adminEmail: "client@example.com",
    createdAt: "2026-10-12T10:00:00.000Z",
    details: JSON.stringify({ documentType: "devis_do", documentNumero: "DO-2026-004" }),
  },
  {
    id: "log-draft",
    action: "client_quote_draft_deleted",
    adminEmail: "client@example.com",
    createdAt: "2026-10-12T10:01:00.000Z",
    details: JSON.stringify({ raisonSociale: "SCA Brouillon" }),
  },
])

assert.equal(journal[0]?.actionLabel, "Devis supprimé : Devis DO DO-2026-004")
assert.equal(journal[1]?.actionLabel, "Brouillon de devis supprimé : SCA Brouillon")

console.log("verify-client-quote-delete: ok")
