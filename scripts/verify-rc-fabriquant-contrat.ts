import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
// @ts-expect-error - pdf-parse n'expose pas de types fiables dans cet environnement
import pdfParse from "pdf-parse"
import {
  generateRcFabBatteriesFicPdf,
  generateRcFabBatteriesPolicyPdf,
  generateRcFabBatteriesQuotePdf,
} from "@/lib/pdf/rc-fabriquant/generateDossier"
import {
  RC_FAB_ADRESSE_NON_DECLAREE,
  RC_FAB_GARANTIES_IMPRIMEES,
  buildRcFabContratConfig,
  parseRcFabDemande,
  rcFabDemandeLines,
} from "@/lib/rc-fabriquant-contrat-demande"
import {
  RC_FAB_BATTERIES_ACTIVITE,
  readRcFabDossierConfig,
  serializeRcFabDossierConfig,
} from "@/lib/rc-fabriquant-dossier-config"

function normalize(input: string): string {
  return input.replace(/\r/g, "\n").replace(/[ \t]+/g, " ")
}

async function textOf(bytes: Uint8Array): Promise<string> {
  const parsed = await pdfParse(Buffer.from(bytes))
  return normalize(parsed.text || "")
}

const lead = {
  raisonSociale: "Compotes du Val",
  siret: "12345678901234",
  telephone: "0241000000",
  activiteFabrication: "fabrication de compotes bio",
  typeProduit: "alimentaire",
  zoneDistribution: "Europe",
  sousTraitance: false,
  controleQualite: true,
  caAnnuelTotal: 800000,
  caExport: 120000,
  sinistres5Ans: 0,
  effectifs: "12",
  message: "Besoin d'une RC produits pour la grande distribution",
}

const demande = parseRcFabDemande(JSON.stringify(lead), "compotes@example.com")
assert.equal(demande.activiteAssuree, "fabrication de compotes bio")
assert.equal(demande.typeProduitLabel, "Alimentaire")
const lines = rcFabDemandeLines(demande)
assert.ok(lines.some((line) => line.includes("Compotes du Val")))
assert.ok(lines.some((line) => line.includes("12345678901234")))
assert.ok(lines.some((line) => line.includes("Type de produit : Alimentaire")))
assert.ok(lines.some((line) => line.includes("Zone de distribution : Europe")))
assert.ok(lines.some((line) => line.includes("Sous-traitance : Non")))
assert.ok(lines.some((line) => line.includes("Contrôle qualité : Oui")))
assert.ok(lines.some((line) => /800[\s\u00a0\u202f]*000/.test(line)))
assert.ok(lines.some((line) => line.includes("grande distribution")))

const config = buildRcFabContratConfig({
  demande,
  referenceContrat: "RCFAB-COMPOTES",
  periodicite: "trimestriel",
  primeAnnuelleTtc: 2400,
})
assert.equal(config.activite, "fabrication de compotes bio")
assert.equal(config.plafondGlobalParSinistreEtParAn, RC_FAB_GARANTIES_IMPRIMEES.plafond)
assert.equal(config.plafondGlobalParSinistreEtParAn, 2_500_000)
assert.equal(config.franchiseParSinistre, 5_000)
assert.equal(config.protectionJuridique, 20_000)
assert.equal(config.montantParEcheanceTtc, 600)

const roundTrip = readRcFabDossierConfig(serializeRcFabDossierConfig(config), 600, "RCFAB-COMPOTES")
assert.equal(roundTrip.activite, "fabrication de compotes bio")
assert.ok(roundTrip.demandeLignes.some((line) => line.includes("Alimentaire")))
assert.equal(roundTrip.plafondGlobalParSinistreEtParAn, 2_500_000)

const legacy = readRcFabDossierConfig(
  JSON.stringify({ rcFabriquantDossierConfig: { periodicite: "trimestriel", primeAnnuelleTtc: 1200 } }),
  300,
  "RCFAB-ANCIEN"
)
assert.equal(legacy.activite, RC_FAB_BATTERIES_ACTIVITE)
assert.deepEqual(legacy.demandeLignes, [])
assert.equal(legacy.plafondGlobalParSinistreEtParAn, 2_500_000)

async function main() {
const document = {
  nomSociete: demande.raisonSociale,
  siret: demande.siret,
  adresse: RC_FAB_ADRESSE_NON_DECLAREE,
  activite: config.activite,
  dateEffet: "11/10/2026",
  dateEcheance: "11/10/2027",
  referenceContrat: config.referenceContrat,
  config,
  demandeLines: config.demandeLignes,
}

const [quote, fic, policy] = await Promise.all([
  generateRcFabBatteriesQuotePdf(document),
  generateRcFabBatteriesFicPdf(document),
  generateRcFabBatteriesPolicyPdf(document),
])

for (const [name, bytes] of [
  ["devis", quote],
  ["fic", fic],
  ["contrat", policy],
] as const) {
  const text = await textOf(bytes)
  assert.match(text, /Demande du client/, `${name} reprend la demande`)
  assert.match(text, /Compotes du Val/, `${name} reprend la société`)
  assert.match(text, /fabrication de compotes bio/, `${name} reprend l'activité déclarée`)
  assert.match(text, /Type de produit : Alimentaire/, `${name} reprend le type`)
  assert.match(text, /Zone de distribution : Europe/, `${name} reprend la zone`)
  assert.match(text, /2[\s\u00a0\u202f]*500[\s\u00a0\u202f]*000/, `${name} garde le plafond`)
  assert.match(text, /5[\s\u00a0\u202f]*000/, `${name} garde la franchise`)
  assert.match(text, /20[\s\u00a0\u202f]*000/, `${name} garde la protection juridique`)
  assert.doesNotMatch(text, /Fabricant Batteries/, `${name} ne titre pas batteries`)
  assert.doesNotMatch(text, /fabrication de batteries/i, `${name} n'impose pas l'activité batteries`)
}

const batteries = await generateRcFabBatteriesQuotePdf({
  nomSociete: "Atelier Cellules",
  siret: "98765432109876",
  adresse: "1 rue des Piles",
  activite: RC_FAB_BATTERIES_ACTIVITE,
  dateEffet: "11/10/2026",
  dateEcheance: "11/10/2027",
  referenceContrat: "RCFAB-BATT",
  config: buildRcFabContratConfig({
    demande: parseRcFabDemande(
      JSON.stringify({
        raisonSociale: "Atelier Cellules",
        siret: "98765432109876",
        activiteFabrication: "fabrication de batteries",
        typeProduit: "batterie",
        zoneDistribution: "France",
        caAnnuelTotal: 500000,
      }),
      "batteries@example.com"
    ),
    referenceContrat: "RCFAB-BATT",
    periodicite: "trimestriel",
    primeAnnuelleTtc: 1800,
  }),
})
const batteriesText = await textOf(batteries)
assert.match(batteriesText, /Fabricant Batteries/)
assert.match(batteriesText, /fabrication de batteries/)

const route = readFileSync("app/api/gestion/rc-fabriquant-lead/generer-contrat/route.ts", "utf8")
assert.match(route, /generateRcFabBatteriesQuotePdf/)
assert.match(route, /generateRcFabBatteriesFicPdf/)
assert.match(route, /generateRcFabBatteriesPolicyPdf/)
assert.doesNotMatch(route, /payments\.create|paymentLinks\.create|uploadPdfAndInsertSignRequest|createSupabaseServiceClient|sendEmail/)

const page = readFileSync("app/gestion/page.tsx", "utf8")
assert.match(page, /id="rc-contrat-demande"/)
assert.match(page, /Générer le contrat/)
assert.match(page, /Préparer le contrat/)
assert.match(page, /\/api\/gestion\/rc-fabriquant-lead\/generer-contrat/)
assert.match(page, /Aucun email, aucune signature et aucun paiement/)

console.log("verify-rc-fabriquant-contrat: ok")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
