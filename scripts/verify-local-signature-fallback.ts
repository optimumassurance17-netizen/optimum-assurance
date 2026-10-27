import { PDFDocument } from "pdf-lib"
import { applySignatureToPdf } from "../lib/esign/apply-signature-to-pdf"
import { readFileSync } from "node:fs"
import { nextSerialNumero } from "../lib/document-numero"
import { createSignRequestWithFallback } from "../lib/esign/create-sign-request-with-fallback"
import {
  FALLBACK_PDF_KEY,
  LOCAL_SIGNATURE_PROVIDER,
  LOCAL_SIGNED_PDF_KEY,
  MAX_LOCAL_SIGNATURE_PDF_BYTES,
  signaturePdfTooLargeMessage,
  decodeStoredPdfBase64,
  isLocalCustomPdfContract,
  isLocalFallbackContract,
  isLocalSignableContract,
  isRebuildableDecennaleContract,
  isSupabaseConnectivityError,
  readContractObject,
  safeLogMessage,
  stripSignatureBinaries,
  stripSignatureBinariesFromJsonString,
} from "../lib/esign/local-signature-fallback"
import { renderPendingDecennalePdf } from "../lib/esign/render-pending-decennale-pdf"

const PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

async function main() {
  assert(
    isSupabaseConnectivityError(
      new Error("Le service de signature électronique est injoignable. L’adresse du projet Supabase ne répond pas.")
    ),
    "le message client de projet injoignable doit basculer en secours"
  )
  assert(
    isSupabaseConnectivityError(new Error("fetch failed", { cause: { code: "ENOTFOUND" } })),
    "ENOTFOUND doit basculer en secours"
  )
  assert(!isSupabaseConnectivityError(new Error("Bucket not found")), "une erreur de bucket ne doit pas basculer")
  assert(
    !isSupabaseConnectivityError(
      new Error("Configuration Supabase incomplète (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).")
    ),
    "une configuration absente ne doit pas être traitée comme une panne réseau"
  )
  assert(!safeLogMessage(new Error("Authorization bearer eyJhbGciOi.secret")).includes("eyJ"), "le journal masque les jetons")
  assert(
    isSupabaseConnectivityError(new Error("The operation was aborted due to timeout")),
    "un délai dépassé doit basculer en secours"
  )
  const rebuildable = {
    raisonSociale: "Atelier test",
    activites: ["Maçonnerie"],
    primeAnnuelle: 1200,
    dateEffet: "01/01/2026",
    dateEcheance: "31/12/2026",
    franchise: 1000,
    plafond: 100000,
    chiffreAffaires: 80000,
  }
  assert(isRebuildableDecennaleContract(rebuildable), "un dossier décennale complet se reconstruit sans Supabase")
  assert(
    !isRebuildableDecennaleContract({ ...rebuildable, customUploadedDevisFlow: true }),
    "un PDF personnalisé ne se reconstruit pas"
  )
  const rebuilt = await renderPendingDecennalePdf(rebuildable, "C-REBUILD")
  assert(Buffer.from(rebuilt.subarray(0, 5)).toString("latin1") === "%PDF-", "le contrat reconstruit est un PDF")

  const preview = readFileSync("lib/esign/resolve-sign-preview.ts", "utf8")
  const signRoute = readFileSync("app/api/sign/route.ts", "utf8")
  assert(signRoute.includes("completeLocalSignature"), "la signature locale finalise décennale et devis personnalisé")
  const supabaseClient = readFileSync("lib/supabase.ts", "utf8")
  const gestion = readFileSync("app/gestion/page.tsx", "utf8")
  assert(preview.includes("isRebuildableDecennaleContract"), "l'aperçu ouvre un contrat décennale sans Supabase")
  assert(!preview.includes("createSupabaseServiceClient"), "l'aperçu ne consulte plus Supabase")
  assert(!preview.includes("sign_requests"), "l'aperçu ne lit plus les demandes Supabase")
  assert(signRoute.includes("completeRebuiltDecennaleSignature"), "la signature finalise le contrat reconstruit")
  assert(!signRoute.includes("createSupabaseServiceClient"), "la signature ne passe plus par Supabase")
  assert(!signRoute.includes("sign_requests"), "la signature ne lit plus les demandes Supabase")
  assert(supabaseClient.includes("ipv4first"), "les appels Supabase préfèrent IPv4")
  assert(
    nextSerialNumero("CTR-2026-", ["CTR-2026-0002", "CTR-2026-0010"]) === "CTR-2026-0011",
    "le prochain contrat dépasse le plus grand numéro, pas le plus récent"
  )
  assert(nextSerialNumero("CTR-2026-", []) === "CTR-2026-0001", "le premier contrat commence à 0001")
  const finalize = readFileSync("lib/pending-signature-finalize.ts", "utf8")
  const localComplete = readFileSync("lib/esign/complete-local-signature.ts", "utf8")
  assert(finalize.includes("isContractFromThisSignature"), "une signature déjà créée se termine au lieu d'échouer")
  assert(finalize.includes("documentId: created.id"), "la finalisation renvoie le contrat créé")
  assert(
    localComplete.includes("finalized.documentId"),
    "le lien de signature pointe vers le contrat réellement créé"
  )
  assert(gestion.includes("Réparer"), "la réparation reste disponible depuis la gestion")
  assert(!gestion.includes("s.repairEligible ?"), "la réparation n'attend plus 24 heures")
  const repairRoute = readFileSync("app/api/gestion/signatures/repair/route.ts", "utf8")
  assert(repairRoute.includes("sendPendingSignatureReminder"), "Réparer relance la signature par email")
  assert(
    !repairRoute.includes("repairPendingSignature"),
    "Réparer n'interroge plus Supabase avant le rappel"
  )
  assert(!repairRoute.includes("createSupabaseServiceClient"), "Réparer ne contacte plus Supabase")

  const source = await PDFDocument.create()
  source.addPage([400, 600])
  const pdfBase64 = Buffer.from(await source.save()).toString("base64")
  const stored = {
    signatureProvider: LOCAL_SIGNATURE_PROVIDER,
    numero: "C-TEST",
    raisonSociale: "Atelier test",
    [FALLBACK_PDF_KEY]: pdfBase64,
  }
  assert(isLocalFallbackContract(stored), "un dossier décennale local doit être reconnu")
  assert(!isRebuildableDecennaleContract(stored), "le secours local déjà stocké n'est pas une reconstruction")
  const customLocal = { ...stored, customUploadedDevisFlow: true }
  assert(!isLocalFallbackContract(customLocal), "un devis PDF personnalisé n'est pas un contrat décennale")
  assert(isLocalCustomPdfContract(customLocal), "un devis PDF personnalisé se signe sans Supabase")
  assert(isLocalSignableContract(stored) && isLocalSignableContract(customLocal), "les deux parcours locaux sont signables")
  const localRequest = await createSignRequestWithFallback(Buffer.from(await source.save()))
  assert(localRequest.signatureProvider === LOCAL_SIGNATURE_PROVIDER, "la demande de signature ne passe pas par Supabase")
  assert(localRequest.fallbackPdfBase64.length > 80, "le PDF reste dans la demande locale")
  const creator = readFileSync("lib/esign/create-sign-request-with-fallback.ts", "utf8")
  const customSend = readFileSync("app/api/gestion/sign/send-custom-devis-pdf/route.ts", "utf8")
  const contractPdf = readFileSync("lib/insurance-contract-pdf.ts", "utf8")
  assert(!creator.includes("uploadPdfAndInsertSignRequest"), "la création de signature n'envoie plus le PDF à Supabase")
  assert(!customSend.includes("createSupabaseServiceClient"), "l'invitation PDF personnalisé n'exige plus Supabase")
  assert(customSend.includes("MAX_LOCAL_SIGNATURE_PDF_BYTES"), "l'invitation utilise la limite de la signature")
  assert(!customSend.includes("15 Mo"), "l'invitation n'annonce plus 15 Mo")
  assert(customSend.includes("signaturePdfTooLargeMessage()"), "le refus de taille part avant l'envoi")
  const gestionPage = readFileSync("app/gestion/page.tsx", "utf8")
  assert(gestionPage.includes("signaturePdfTooLargeMessage()"), "la gestion refuse le PDF trop lourd avant l'envoi")
  assert(MAX_LOCAL_SIGNATURE_PDF_BYTES === 5 * 1024 * 1024, "la signature accepte 5 Mo")
  assert(signaturePdfTooLargeMessage().includes("5 Mo"), "le message annonce 5 Mo")
  const gestionClient = readFileSync("lib/esign/send-custom-devis-client.ts", "utf8")
  assert(gestionClient.includes("pdfUploadToken"), "un PDF de plus de 2 Mo part en morceaux")
  assert(customSend.includes("pdfUploadToken"), "l'invitation reconstitue les morceaux")
  const previewRoute = readFileSync("app/api/sign/local-pdf/[id]/route.ts", "utf8")
  assert(previewRoute.includes("pdfBytesResponse"), "l'aperçu du PDF est envoyé en flux")
  const oversized = Buffer.alloc(MAX_LOCAL_SIGNATURE_PDF_BYTES + 1)
  oversized.write("%PDF-", 0, "latin1")
  let rejectedOversized = false
  try {
    await createSignRequestWithFallback(oversized)
  } catch (error) {
    rejectedOversized = error instanceof Error && error.message === signaturePdfTooLargeMessage()
  }
  assert(rejectedOversized, "un PDF au-dessus de 5 Mo est refusé")
  assert(contractPdf.includes("LOCAL_DOCUMENT_KEY_PREFIX"), "le devis signé local se relit sans Supabase")

  const decoded = decodeStoredPdfBase64(stored[FALLBACK_PDF_KEY])
  assert(decoded, "le PDF stocké doit être relu")
  const signed = await applySignatureToPdf(decoded, PNG_DATA_URL, "client@example.com", "2026-10-08T12:00:00.000Z")
  assert(Buffer.from(signed.subarray(0, 5)).toString("latin1") === "%PDF-", "le PDF signé reste un PDF")

  const signedBase64 = Buffer.from(signed).toString("base64")
  const withBinaries = {
    ...stored,
    [LOCAL_SIGNED_PDF_KEY]: signedBase64,
    localSignatureAudit: { documentHash: "abc" },
  }
  const pub = stripSignatureBinaries(withBinaries) as Record<string, unknown>
  assert(!(FALLBACK_PDF_KEY in pub) && !(LOCAL_SIGNED_PDF_KEY in pub), "la réponse client ne contient pas les PDF")
  assert(pub.localSignatureAudit && pub.numero === "C-TEST", "l'audit et le contrat restent lisibles")
  assert(FALLBACK_PDF_KEY in withBinaries, "le retrait des PDF ne modifie pas l'objet stocké")

  const json = stripSignatureBinariesFromJsonString(JSON.stringify(withBinaries))
  const parsed = readContractObject(json)
  assert(parsed && !(FALLBACK_PDF_KEY in parsed) && parsed.raisonSociale === "Atelier test", "le JSON dashboard est allégé")
  assert(stripSignatureBinariesFromJsonString('{"numero":"C-1"}') === '{"numero":"C-1"}', "un JSON sans PDF reste intact")

  console.log("Signature de secours : vérifications OK")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
