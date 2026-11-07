import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import { buildDoOperationLines } from "../lib/do-operation-lines"
import {
  estClosEtCouvert,
  libelleLotsCouverts,
  lotsEffectifs,
  lotsParDefaut,
  normaliserLotsCouverts,
  resumeLotsDocument,
  texteIndiqueClosCouvert,
} from "../lib/do-options-lots"

const structure = lotsParDefaut(true)
assert.equal(estClosEtCouvert(structure), true)
assert.equal(estClosEtCouvert(["Terrassement"]), true)
assert.equal(estClosEtCouvert([...structure, "Plomberie"]), false)
assert.deepEqual(normaliserLotsCouverts([" électricité ", "Électricité", "Inconnu"]), ["Électricité"])
assert.equal(normaliserLotsCouverts("Plomberie").length, 0)
assert.equal(libelleLotsCouverts(lotsParDefaut(false)), "Tous les lots de l'opération")
assert.equal(lotsEffectifs({ operationClosCouvert: true }).length, structure.length)
assert.deepEqual(lotsEffectifs({ lotsCouverts: ["Plomberie"], operationClosCouvert: true }), ["Plomberie"])

const partiel = buildDoOperationLines({ lotsCouverts: ["Gros œuvre", "Plomberie"] })
assert.ok(partiel.some((line) => line === "Clos et couvert : Non"))
assert.ok(partiel.some((line) => line === "Lots couverts : Gros œuvre, Plomberie"))

const clos = buildDoOperationLines({ operationClosCouvert: true })
assert.ok(clos.some((line) => line.startsWith("Lots couverts : Terrassement, VRD, Gros œuvre")))
assert.ok(clos.some((line) => line === "Clos et couvert : Oui"))

const resume = resumeLotsDocument({ lotsCouverts: ["Terrassement"] })
assert.equal(resume?.closEtCouvert, true)
assert.ok(resume?.exclus.includes("Plomberie"))
assert.equal(resumeLotsDocument({ closCouvert: false }), null)
assert.equal(resumeLotsDocument({ closCouvert: true })?.couverts[0], "Terrassement")
assert.equal(
  resumeLotsDocument({ caracteristiques: ["Lots couverts : Tous les lots de l'opération"] })?.closEtCouvert,
  false
)

assert.equal(texteIndiqueClosCouvert("Clos et couvert : Non"), false)
assert.equal(texteIndiqueClosCouvert("Garantie clos et couvert"), true)
assert.equal(texteIndiqueClosCouvert("Lots couverts : Terrassement"), false)

const form = readFileSync(new URL("../components/FormulaireDevisDommageOuvrage.tsx", import.meta.url), "utf8")
const gestion = readFileSync(new URL("../app/gestion/page.tsx", import.meta.url), "utf8")
const devis = readFileSync(new URL("../components/documents/DevisDoTemplate.tsx", import.meta.url), "utf8")
const create = readFileSync(new URL("../app/api/gestion/contracts/do/create/route.ts", import.meta.url), "utf8")
assert.ok(form.includes("DoLotsCouvertsPicker"))
assert.ok(form.includes("Choisissez au moins un lot couvert."))
assert.ok(gestion.includes("DoLotsCouvertsPicker"))
assert.ok(gestion.includes("lotsCouverts: devisDoForm.lotsCouverts"))
assert.ok(devis.includes("resumeLotsDocument"))
assert.ok(create.includes("Lots couverts :"))

console.log("options DO par lot : ok")
