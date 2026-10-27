import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { decennaleRowsToRemove } from "../lib/decennale-contract-replacement-rules"

const older = { id: "old", createdAt: new Date("2026-01-01T00:00:00.000Z") }
const newer = { id: "new", createdAt: new Date("2026-10-01T00:00:00.000Z") }
const sameTimeA = { id: "a", createdAt: new Date("2026-10-01T00:00:00.000Z") }
const sameTimeB = { id: "b", createdAt: new Date("2026-10-01T00:00:00.000Z") }

assert.deepEqual(decennaleRowsToRemove([newer]), [])
assert.deepEqual(decennaleRowsToRemove([older, newer]), ["old"])
assert.deepEqual(decennaleRowsToRemove([newer, older], "old"), ["new"])
assert.deepEqual(decennaleRowsToRemove([sameTimeA, sameTimeB]).sort(), ["a"])

const replacement = readFileSync("lib/decennale-contract-replacement.ts", "utf8")
const service = readFileSync("lib/insurance-contract-service.ts", "utf8")
const signature = readFileSync("lib/pending-signature-finalize.ts", "utf8")
const clientContracts = readFileSync("app/api/client/insurance-contracts/route.ts", "utf8")
const documentsList = readFileSync("app/api/documents/list/route.ts", "utf8")
const dashboard = readFileSync("app/api/gestion/dashboard/route.ts", "utf8")
const doCreate = readFileSync("app/api/contracts/create/route.ts", "utf8")

assert.match(replacement, /productType: "decennale"/)
assert.match(replacement, /type: "contrat"/)
assert.match(replacement, /isDecennaleContractData/)
assert.match(replacement, /decennale_contract_replaced/)
assert.match(service, /productType === "decennale" && input\.userId/)
assert.match(service, /keepInsuranceContractId: c\.id/)
assert.match(signature, /keepDocumentId: id/)
assert.match(clientContracts, /collapseDecennaleContractDuplicates/)
assert.match(documentsList, /collapseDecennaleContractDuplicates/)
assert.match(dashboard, /collapseDecennaleContractDuplicates\(\)/)
assert.match(doCreate, /findReusableDoContract/)
assert.doesNotMatch(doCreate, /collapseDecennaleContractDuplicates/)

console.log("Remplacement des contrats décennale : vérifications OK")
