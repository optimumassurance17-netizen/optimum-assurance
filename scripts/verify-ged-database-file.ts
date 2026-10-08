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

console.log("GED base de secours : OK")
