import { readFileSync } from "node:fs"
import {
  decennaleDevisMatchKey,
  doDevisMatchKey,
  etudeDevisMatchKey,
  findFirstMatchingKey,
  rcDevisMatchKey,
  titreDevisMatchKey,
} from "../lib/devis-intake"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function read(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8")
}

function before(source: string, earlier: string, later: string, message: string) {
  const start = source.indexOf(earlier)
  const end = source.indexOf(later)
  assert(start >= 0 && end > start, message)
}

const chantier = {
  adresseConstruction: "10 rue de la Paix",
  codePostalConstruction: "75002",
  villeConstruction: "Paris",
}
const sameAddress = doDevisMatchKey({ email: "A@Example.com", data: chantier, coutTotal: 180000 })
const sameAddressStored = doDevisMatchKey({
  email: "a@example.com",
  data: JSON.stringify(chantier),
  coutTotal: 180000,
})
const otherAddress = doDevisMatchKey({
  email: "a@example.com",
  data: { ...chantier, adresseConstruction: "12 rue de Lyon", villeConstruction: "Lyon", codePostalConstruction: "69001" },
  coutTotal: 180000,
})
assert(sameAddress === sameAddressStored, "le même email et la même adresse partagent une clé")
assert(sameAddress !== otherAddress, "une autre adresse de chantier ne reprend pas la même demande")

const company = doDevisMatchKey({
  email: "a@example.com",
  data: { raisonSociale: "SCA Démo" },
  coutTotal: 200000.4,
})
const companyStored = doDevisMatchKey({
  email: "a@example.com",
  data: JSON.stringify({ raisonSociale: "sca demo" }),
  coutTotal: 200000,
})
const otherCost = doDevisMatchKey({
  email: "a@example.com",
  data: { raisonSociale: "SCA Démo" },
  coutTotal: 250000,
})
assert(company === companyStored, "sans adresse, la société et le coût arrondi suffisent")
assert(company !== otherCost, "un autre coût de chantier reste une autre demande")

const siret = decennaleDevisMatchKey({
  email: "A@ex.com",
  siret: "123 456 789 00012",
  raisonSociale: "Autre",
})
const siretStored = decennaleDevisMatchKey({
  email: "a@ex.com",
  siret: "12345678900012",
  raisonSociale: "Différente",
})
const otherSiret = decennaleDevisMatchKey({
  email: "a@ex.com",
  siret: "99999999999999",
  raisonSociale: "Différente",
})
const companyOnly = decennaleDevisMatchKey({ email: "a@ex.com", siret: "123", raisonSociale: "SCA Démo" })
const companyOnlyStored = decennaleDevisMatchKey({ email: "a@ex.com", raisonSociale: "sca demo" })
assert(siret === siretStored, "le même SIRET décennale partage une clé")
assert(siret !== otherSiret, "un autre SIRET décennale ne partage pas la clé")
assert(companyOnly === companyOnlyStored, "sans SIRET complet, la société décennale partage une clé")

const rc = rcDevisMatchKey({ email: "a@ex.com", siret: "12345678900012" })
const rcStored = rcDevisMatchKey({
  email: "a@ex.com",
  data: JSON.stringify({ siret: "12345678900012", raisonSociale: "Batteries" }),
})
const rcOther = rcDevisMatchKey({ email: "a@ex.com", siret: "99999999999999" })
assert(rc === rcStored, "le même SIRET RC partage une clé")
assert(rc !== rcOther, "un autre SIRET RC ne partage pas la clé")

const etude = etudeDevisMatchKey({
  email: "a@ex.com",
  data: { type: "domaine_non_liste", descriptionActivite: "Pose de bardage" },
})
const etudeStored = etudeDevisMatchKey({
  email: "a@ex.com",
  data: JSON.stringify({ type: "domaine_non_liste", descriptionActivite: "pose de bardage" }),
})
const etudeOther = etudeDevisMatchKey({
  email: "a@ex.com",
  data: { type: "domaine_non_liste", descriptionActivite: "Électricité" },
})
assert(etude === etudeStored, "la même étude partage une clé, y compris depuis le JSON stocké")
assert(etude !== etudeOther, "une autre activité d'étude ne partage pas la clé")

const titre = titreDevisMatchKey({
  email: "a@ex.com",
  data: {
    typeOperation: "acquisition",
    adresseBien: "1 rue Verte",
    codePostalBien: "44000",
    villeBien: "Nantes",
  },
})
const titreStored = titreDevisMatchKey({
  email: "a@ex.com",
  data: JSON.stringify({
    typeOperation: "acquisition",
    adresseBien: "1 rue Verte",
    codePostalBien: "44000",
    villeBien: "Nantes",
  }),
})
const titreOther = titreDevisMatchKey({
  email: "a@ex.com",
  data: {
    typeOperation: "acquisition",
    adresseBien: "2 rue Rouge",
    codePostalBien: "44000",
    villeBien: "Nantes",
  },
})
assert(titre === titreStored, "le même bien en assurance titre partage une clé")
assert(titre !== titreOther, "une autre adresse de bien ne partage pas la clé")

const first = findFirstMatchingKey(
  [
    { id: "ancien", key: "a@ex.com|same" },
    { id: "recent", key: "a@ex.com|same" },
  ],
  (row) => row.key,
  "a@ex.com|same"
)
assert(first?.id === "ancien", "la première demande déjà enregistrée est celle qui est reprise")

const doRoute = read("../app/api/devis-dommage-ouvrage/route.ts")
const decennaleRoute = read("../app/api/devis/send-email/route.ts")
const rcRoute = read("../app/api/devis-rc-fabriquant/route.ts")
const etudeRoute = read("../app/api/etude/route.ts")
const titreRoute = read("../app/api/devis-assurance-titre/route.ts")
const gestionDo = read("../app/api/gestion/contracts/do/create/route.ts")
const dashboard = read("../app/api/gestion/dashboard/route.ts")
const clientRequests = read("../app/api/client/demandes-document/route.ts")
const fiche = read("../app/api/gestion/clients/[id]/route.ts")
const page = read("../app/gestion/page.tsx")
const fichePage = read("../app/gestion/clients/[id]/page.tsx")

before(doRoute, "doInitialQuestionnaireJson", "if (duplicateLead)", "un doublon DO enregistre encore le questionnaire")
before(doRoute, "if (duplicateLead)", "await allocateNextContractNumber", "un doublon DO ne prend pas un nouveau numéro")
before(doRoute, "if (duplicateLead)", "await sendNewDevisRequestAlert", "un doublon DO ne renvoie pas l'alerte")
before(
  decennaleRoute,
  "const duplicateLead = findFirstMatchingKey",
  "await allocateNextContractNumber",
  "le doublon décennale est vu avant le numéro de contrat"
)
before(decennaleRoute, "duplicate: true", "devisLead.create", "un doublon décennale ne crée pas une seconde ligne")
before(decennaleRoute, "duplicate: true", "await sendNewDevisRequestAlert", "un doublon décennale ne renvoie pas l'alerte")
assert(decennaleRoute.includes("devisDraft.create"), "le lien de reprise du brouillon reste créé")
before(rcRoute, "duplicate: true", "devisRcFabriquantLead.create", "un doublon RC ne crée pas une seconde ligne")
before(rcRoute, "duplicate: true", "devoirConseilLog.create", "un doublon RC ne réécrit pas le journal DDA")
before(rcRoute, "duplicate: true", "await sendNewDevisRequestAlert", "un doublon RC ne renvoie pas l'alerte")
before(etudeRoute, "duplicate: true", "devisEtudeLead.create", "un doublon d'étude ne crée pas une seconde ligne")
before(etudeRoute, "duplicate: true", "await sendNewDevisRequestAlert", "un doublon d'étude ne renvoie pas l'alerte")
before(
  titreRoute,
  "titleInitialQuestionnaireJson",
  "duplicate: true",
  "un doublon d'assurance titre enregistre encore le questionnaire"
)
before(titreRoute, "duplicate: true", "await sendNewDevisRequestAlert", "un doublon d'assurance titre ne renvoie pas l'alerte")
before(
  gestionDo,
  "await findReusableDoContract",
  "await createInsuranceContract",
  "un devis DO déjà ouvert pour la même adresse est réutilisé"
)
assert(gestionDo.includes("reused: true"), "la création gestion signale le devis déjà ouvert")
assert(page.includes("existe déjà pour cette adresse"), "la gestion prévient que le devis existe déjà")

assert(dashboard.includes("sortRequestsByArrival"), "les listes de devis sont remises dans l'ordre d'arrivée")
assert(dashboard.includes('orderBy: { createdAt: "desc" }'), "la lecture garde les demandes récentes avant de les trier")
assert(dashboard.includes("take: 50"), "la fenêtre des demandes récentes reste limitée")
before(
  clientRequests,
  'orderBy: { createdAt: "desc" }',
  "sortRequestsByArrival(",
  "les demandes de document client sont triées après la lecture"
)
assert(clientRequests.includes("take: 20"), "l'espace client garde les vingt demandes les plus récentes")
assert(fiche.includes("sortRequestsByArrival"), "la fiche remet les demandes de document dans l'ordre d'arrivée")
assert(fiche.includes("take: 20"), "la fiche garde les vingt demandes les plus récentes")
assert(
  fichePage.includes("[...(prev.documentRequests ?? []).filter((row) => row.id !== request.id), request]"),
  "une nouvelle demande de document s'ajoute à la suite"
)

for (const source of [doRoute, decennaleRoute, rcRoute, etudeRoute, titreRoute, gestionDo, clientRequests]) {
  assert(!source.includes("payments.create"), "ces parcours ne créent pas de paiement")
}

console.log("Devis sans doublon : OK")
