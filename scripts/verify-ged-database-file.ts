import { readFileSync } from "node:fs"
import {
  canProxyGedBytes,
  gedInlineContentDisposition,
  GED_PROXY_RESPONSE_MAX_BYTES,
  isClientReadableGedType,
  isOwnedGedObjectPath,
  isSafeGedRedirectUrl,
} from "../lib/ged-policy"
import { issueGedUploadReceipt, readGedUploadReceipt } from "../lib/ged-upload-receipt"
import { labelGedDocument } from "../lib/user-document-types"
import {
  decodeGedDatabaseFile,
  encodeGedDatabaseFile,
  getLocalGedPathCandidates,
  isGedDatabaseFile,
  isGedSupabasePath,
  resolveGedFileReadTarget,
  resolveGedFileStorageTarget,
  resolveGedSupabaseObjectCandidates,
} from "../lib/user-documents"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const sample = Buffer.from([0x25, 0x50, 0x44, 0x46, 0xfb, 0xff, 0xbf, 0x00, 0x2f, 0x67, 0x65, 0x64, 0x2f])
const stored = encodeGedDatabaseFile(sample)

assert(stored.startsWith("dbged:v1:"), "le préfixe de secours doit être présent")
assert(stored.includes("/"), "le jeu d'essai doit contenir un slash base64 pour piéger le résolveur de chemin")
assert(isGedDatabaseFile(stored), "le contenu en base doit être reconnu")
assert(!isGedSupabasePath(stored), "un fichier en base ne doit pas être traité comme un objet Supabase")
assert(resolveGedSupabaseObjectCandidates(stored).length === 0, "aucun candidat Supabase pour un fichier en base")
assert(getLocalGedPathCandidates(stored).length === 0, "aucun chemin local pour un fichier en base")

const read = resolveGedFileReadTarget(stored)
assert(read.kind === "database", "la lecture doit court-circuiter vers la base")
assert(read.kind === "database" && read.bytes.equals(sample), "le décodage doit restituer les octets d'origine")
assert(decodeGedDatabaseFile(stored)?.equals(sample), "decodeGedDatabaseFile doit restituer les octets")

const storage = resolveGedFileStorageTarget(stored)
assert(storage.kind === "database", "la suppression ne doit pas résoudre un chemin")

const remote = "client_documents/ged/user/permis_construire/1_plan.pdf"
assert(isGedSupabasePath(remote), "une clé Supabase existante reste un objet distant")
assert(!isGedDatabaseFile(remote), "une clé Supabase n'est pas un fichier en base")

const broken = "dbged:v1:@@@@"
assert(decodeGedDatabaseFile(broken) === null, "un contenu illisible ne doit pas être décodé")

assert(canProxyGedBytes(GED_PROXY_RESPONSE_MAX_BYTES), "un fichier de 4 Mo doit encore passer par le site")
assert(!canProxyGedBytes(GED_PROXY_RESPONSE_MAX_BYTES + 1), "au-delà de 4 Mo, l'ouverture doit passer par un lien signé")
assert(!canProxyGedBytes(0), "un fichier vide ne s'ouvre pas")

assert(isClientReadableGedType("kbis"), "le catalogue GED reste lisible par le client")
assert(isClientReadableGedType("demande_clxyz12345"), "une pièce demandée reste ouvrable par le client")
assert(!isClientReadableGedType("demande_court"), "un type demande trop court est refusé")
assert(!isClientReadableGedType("contrat"), "un contrat plateforme n'est pas une pièce GED")

assert(isOwnedGedObjectPath("user_1", "ged/user_1/kbis/1_plan.pdf"), "le chemin du client est accepté")
assert(!isOwnedGedObjectPath("user_1", "ged/user_2/kbis/1_plan.pdf"), "le chemin d'un autre client est refusé")
assert(!isOwnedGedObjectPath("user_1", "ged/user_1/../../user_2/secret.pdf"), "un chemin qui remonte est refusé")

assert(isSafeGedRedirectUrl("https://exemple.supabase.co/storage/v1/object/sign/a?token=b"), "un lien https est ouvrable")
assert(isSafeGedRedirectUrl("http://localhost:54321/storage/v1/object/sign/a"), "le stockage local reste ouvrable")
assert(!isSafeGedRedirectUrl("http://evil.example/a"), "un lien http externe est refusé")
assert(!isSafeGedRedirectUrl("javascript:alert(1)"), "un lien javascript est refusé")

const disposition = gedInlineContentDisposition('plan "chantier".pdf\r\nSet-Cookie: a')
assert(!disposition.includes("\r") && !disposition.includes("\n"), "l'en-tête ne doit pas contenir de saut de ligne")
assert(disposition.includes("filename*=UTF-8''"), "le nom réel part en UTF-8")
assert(!disposition.includes('filename=""'), "le nom de secours reste lisible")

const secret = "secret-de-test"
const receipt = issueGedUploadReceipt(
  {
    userId: "user_1",
    type: "plans_construction",
    bucket: "client_documents",
    storagePath: "ged/user_1/plans_construction/1_plan.pdf",
    size: 1200,
    mimeType: "application/pdf",
    filename: "plan.pdf",
  },
  secret,
  1_700_000_000_000
)
const readBack = readGedUploadReceipt(receipt, secret, 1_700_000_000_000)
assert(readBack?.storagePath === "ged/user_1/plans_construction/1_plan.pdf", "le reçu de dépôt se relit")
assert(readGedUploadReceipt(receipt, "autre-secret", 1_700_000_000_000) === null, "un reçu signé avec un autre secret est refusé")
assert(readGedUploadReceipt(receipt, secret, 1_700_000_000_000 + 16 * 60 * 1000) === null, "un reçu expiré est refusé")
assert(
  readGedUploadReceipt(
    issueGedUploadReceipt(
      {
        userId: "user_1",
        type: "kbis",
        bucket: "client_documents",
        storagePath: "ged/user_2/kbis/1.pdf",
        size: 10,
        mimeType: "application/pdf",
        filename: "kbis.pdf",
      },
      secret
    ),
    secret
  ) === null,
  "un reçu vers le dossier d'un autre client est refusé"
)
const tampered = `${receipt.slice(0, 8)}A${receipt.slice(9)}`
assert(readGedUploadReceipt(tampered, secret, 1_700_000_000_000) === null, "un reçu modifié est refusé")

assert(labelGedDocument("titre_propriete").includes("Titre de propriété"), "l'assurance titre a un libellé GED")
assert(
  labelGedDocument("demande_log123456", [{ id: "log123456", message: "Merci d'envoyer le permis de construire." }]) ===
    "Pièce demandée — Merci d'envoyer le permis de construire.",
  "une pièce demandée reprend le message"
)

const adminOpen = readFileSync("app/api/gestion/clients/[id]/documents/[documentId]/route.ts", "utf8")
const clientOpen = readFileSync("app/api/documents/uploaded/[id]/route.ts", "utf8")
const uploadRoute = readFileSync("app/api/documents/uploaded/upload/route.ts", "utf8")
const saveSource = readFileSync("lib/ged-save.ts", "utf8")
assert(adminOpen.includes("openGedDocument"), "l'ouverture gestion passe par le lecteur commun")
assert(clientOpen.includes("openGedDocument"), "l'ouverture client passe par le lecteur commun")
assert(clientOpen.includes("isClientReadableGedType"), "le client peut ouvrir une pièce demandée")
assert(uploadRoute.includes("prepareGedDirectUpload"), "un gros fichier prépare un dépôt direct")
assert(saveSource.includes("createdAt: depositedAt"), "un remplacement met à jour la date de dépôt")

console.log("GED base de secours : OK")
