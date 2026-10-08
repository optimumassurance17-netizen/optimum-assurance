import {
  buildUserCleanupPlan,
  normalizeAccountEmail,
  normalizeAccountSiret,
  type AccountForeignKey,
} from "../lib/client-account-plan"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const fks: AccountForeignKey[] = [
  { childTable: "Document", childColumn: "userId", parentTable: "User", parentColumn: "id", childNullable: false },
  { childTable: "ResiliationLog", childColumn: "documentId", parentTable: "Document", parentColumn: "id", childNullable: false },
  { childTable: "ResiliationRequest", childColumn: "documentId", parentTable: "Document", parentColumn: "id", childNullable: false },
  { childTable: "ResiliationRequest", childColumn: "userId", parentTable: "User", parentColumn: "id", childNullable: false },
  { childTable: "UserDocument", childColumn: "userId", parentTable: "User", parentColumn: "id", childNullable: false },
  { childTable: "Sinistre", childColumn: "userId", parentTable: "User", parentColumn: "id", childNullable: false },
  { childTable: "Sinistre", childColumn: "userDocumentId", parentTable: "UserDocument", parentColumn: "id", childNullable: true },
  { childTable: "InsuranceContract", childColumn: "userId", parentTable: "User", parentColumn: "id", childNullable: true },
  { childTable: "Payment", childColumn: "userId", parentTable: "User", parentColumn: "id", childNullable: false },
]

const plan = buildUserCleanupPlan(fks)
const names = plan.map((step) => `${step.action}:${step.table}`)
assert(names.includes("null:InsuranceContract"), "le contrat plateforme est détaché")
assert(!names.includes("delete:InsuranceContract"), "le contrat plateforme n'est pas supprimé")

const deleteNames = plan.filter((step) => step.action === "delete").map((step) => step.table)
const index = (table: string) => deleteNames.indexOf(table)
assert(index("ResiliationLog") < index("Document"), "le journal de résiliation part avant le document")
assert(index("ResiliationRequest") < index("Document"), "la demande de résiliation part avant le document")
assert(index("Sinistre") < index("UserDocument"), "le sinistre part avant le fichier GED")
assert(normalizeAccountEmail("  Jean@Example.FR ") === "jean@example.fr", "l'email de compte est normalisé")
assert(normalizeAccountSiret("732 829 320 00074") === "73282932000074", "le SIRET est comparable sans espaces")
assert(normalizeAccountSiret("123") === null, "un SIRET incomplet ne sert pas de clé")

console.log("Comptes client : OK")
