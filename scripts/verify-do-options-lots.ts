import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import { buildDoSouscriptionInsurancePayload } from "../lib/build-do-souscription-payload"
import { buildDoOperationLines } from "../lib/do-operation-lines"
import { applyPendingDoQuoteCorrection, describePendingDoQuote } from "../lib/do-quote-pending"
import {
  activitesAvecLignesCouverture,
  estClosEtCouvert,
  libelleLotsCouverts,
  lignesCouvertureLots,
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

const lignesClos = lignesCouvertureLots({ lotsCouverts: ["Terrassement"] })
assert.deepEqual(lignesClos, ["Garantie clos et couvert", "Lots couverts : Terrassement"])
const lignesCompletes = lignesCouvertureLots({ operationClosCouvert: false })
assert.equal(lignesCompletes[0], "Dommage ouvrage complète")
assert.match(lignesCompletes[1] ?? "", /Tous les lots de l'opération/)
assert.deepEqual(lignesCouvertureLots({}), [])

const avecNature = activitesAvecLignesCouverture(["Maison individuelle"], lignesClos)
assert.deepEqual(avecNature, ["Maison individuelle", ...lignesClos])
assert.deepEqual(activitesAvecLignesCouverture(avecNature, lignesCompletes), avecNature)
assert.deepEqual(
  activitesAvecLignesCouverture(["Maison individuelle", "Dommage ouvrage complète"], lignesClos),
  ["Maison individuelle", "Dommage ouvrage complète"]
)

const corrige = applyPendingDoQuoteCorrection(
  { lotsCouverts: ["Plomberie"], coutTotal: 1000 },
  { chantier: "1 rue du Port", constructionCost: 180000 }
)
assert.deepEqual(corrige.lotsCouverts, ["Plomberie"])
const visible = describePendingDoQuote({
  hasDoContract: false,
  initialJson: JSON.stringify({
    lotsCouverts: ["Terrassement", "Plomberie"],
    coutTotal: 180000,
    adresseConstruction: "1 rue du Port",
  }),
})
assert.equal(
  visible?.lotsCouverture,
  "Dommage ouvrage complète · Lots couverts : Terrassement, Plomberie"
)
assert.equal(
  describePendingDoQuote({
    hasDoContract: false,
    initialJson: JSON.stringify({ coutTotal: 180000 }),
  })?.lotsCouverture,
  null
)

const payload = buildDoSouscriptionInsurancePayload(
  {
    qualiteMaitreOuvrage: "particulier_habitation",
    raisonSociale: "Jean Martin",
    email: "jean@example.com",
    adresse: "2 rue Haute",
    codePostal: "75001",
    ville: "Paris",
    adresseConstruction: "1 rue du Port",
    codePostalConstruction: "69001",
    villeConstruction: "Lyon",
    typeOuvrage: "maison_individuelle",
    lotsCouverts: ["Terrassement", "Gros œuvre"],
  },
  180000
)
assert.deepEqual(payload?.lotsCouverts, ["Terrassement", "Gros œuvre"])
assert.equal(payload?.operationClosCouvert, true)
assert.equal(payload?.premium, 3040)
const sansLots = buildDoSouscriptionInsurancePayload(
  {
    qualiteMaitreOuvrage: "particulier_habitation",
    raisonSociale: "Jean Martin",
    email: "jean@example.com",
    adresse: "2 rue Haute",
    codePostal: "75001",
    ville: "Paris",
    adresseConstruction: "1 rue du Port",
    codePostalConstruction: "69001",
    villeConstruction: "Lyon",
    typeOuvrage: "maison_individuelle",
  },
  180000
)
assert.equal(sansLots?.lotsCouverts, undefined)
assert.equal(sansLots?.premium, payload?.premium)

const form = readFileSync(new URL("../components/FormulaireDevisDommageOuvrage.tsx", import.meta.url), "utf8")
const gestion = readFileSync(new URL("../app/gestion/page.tsx", import.meta.url), "utf8")
const devis = readFileSync(new URL("../components/documents/DevisDoTemplate.tsx", import.meta.url), "utf8")
const create = readFileSync(new URL("../app/api/gestion/contracts/do/create/route.ts", import.meta.url), "utf8")
const online = readFileSync(new URL("../app/api/contracts/create/route.ts", import.meta.url), "utf8")
const attestation = readFileSync(new URL("../lib/do-attestation-source.ts", import.meta.url), "utf8")
const souscription = readFileSync(new URL("../lib/souscription-insurance-contract.ts", import.meta.url), "utf8")
const fiche = readFileSync(new URL("../app/gestion/clients/[id]/page.tsx", import.meta.url), "utf8")
assert.ok(form.includes("DoLotsCouvertsPicker"))
assert.ok(form.includes("Choisissez au moins un lot couvert."))
assert.ok(gestion.includes("DoLotsCouvertsPicker"))
assert.ok(gestion.includes("lotsCouverts: devisDoForm.lotsCouverts"))
assert.ok(devis.includes("resumeLotsDocument"))
assert.ok(create.includes("Lots couverts :"))
assert.ok(online.includes("coverageLinesForDoUser"))
assert.ok(online.includes("activitesAvecLignesCouverture"))
assert.ok(attestation.includes("activitesAvecLignesCouverture"))
assert.ok(souscription.includes("lotsCouverts: data.lotsCouverts"))
assert.ok(fiche.includes("pendingDoQuote.lotsCouverture"))

console.log("options DO par lot : ok")
