import { PDFDocument } from "pdf-lib"
import { applySignatureToPdf } from "../lib/esign/apply-signature-to-pdf"
import {
  FALLBACK_PDF_KEY,
  LOCAL_SIGNATURE_PROVIDER,
  LOCAL_SIGNED_PDF_KEY,
  decodeStoredPdfBase64,
  isLocalFallbackContract,
  isSupabaseConnectivityError,
  readContractObject,
  safeLogMessage,
  stripSignatureBinaries,
  stripSignatureBinariesFromJsonString,
} from "../lib/esign/local-signature-fallback"

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
  assert(
    !isLocalFallbackContract({ ...stored, customUploadedDevisFlow: true }),
    "un devis PDF personnalisé ne doit pas utiliser le secours"
  )

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
