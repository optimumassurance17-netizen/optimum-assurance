import { readFileSync } from "node:fs"
import { factureDecennaleLignes, factureDoLignes, presenterFactureDecennale } from "../lib/facture-montants"

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

function sums(echeance: number, frais: number, total: number) {
  assert(Math.abs(echeance + frais - total) < 0.02, `${echeance} + ${frais} doit faire ${total}`)
}

const mois = factureDecennaleLignes({
  primeAnnuelle: 1200,
  fraisGestion: 60,
  montantPaye: 160,
  periodicite: "mensuel",
})
assert(mois.montantEcheance === 100, "le 1er mois d'une prime de 1 200 € est 100 €")
assert(mois.montantTotalPaye === 160, "le total encaissé reste 160 €")
assert(mois.periodicite === "mensuel", "la facture mensuelle reste au mois")
assert(mois.libelleSousTitre.includes("1er mois"), "le sous-titre dit 1er mois")
sums(mois.montantEcheance, mois.fraisGestion, mois.montantTotalPaye)

const trimestre = factureDecennaleLignes({
  primeAnnuelle: 1200,
  fraisGestion: 60,
  montantPaye: 360,
  periodicite: "trimestriel",
})
assert(trimestre.montantEcheance === 300, "le 1er trimestre d'une prime de 1 200 € est 300 €")
assert(trimestre.libelleSousTitre.includes("1er trimestre"), "le sous-titre dit 1er trimestre")
sums(trimestre.montantEcheance, trimestre.fraisGestion, trimestre.montantTotalPaye)

const infereMois = factureDecennaleLignes({
  primeAnnuelle: 1200,
  fraisGestion: 60,
  montantPaye: 160,
})
assert(infereMois.periodicite === "mensuel", "160 € sur 1 200 € se lisent comme un mois")

const infereTrimestre = factureDecennaleLignes({
  primeAnnuelle: 1200,
  fraisGestion: 60,
  montantPaye: 360,
})
assert(infereTrimestre.periodicite === "trimestriel", "360 € sur 1 200 € se lisent comme un trimestre")

const corrigee = presenterFactureDecennale({
  primeAnnuelle: 1200,
  fraisGestion: 60,
  montantPremierTrimestre: 300,
  montantTotalPaye: 160,
})
assert(corrigee.montantEcheance === 100, "une facture incohérente reprend le montant réellement payé")
assert(corrigee.periodicite === "mensuel", "le total payé de 160 € correspond au mois")
sums(corrigee.montantEcheance, corrigee.fraisGestion, corrigee.montantTotalPaye)

const conservee = presenterFactureDecennale({
  primeAnnuelle: 1200,
  fraisGestion: 60,
  montantPremierTrimestre: 300,
  montantTotalPaye: 360,
})
assert(conservee.montantEcheance === 300, "une facture trimestrielle déjà juste n'est pas réécrite")
assert(conservee.periodicite === "trimestriel", "300 + 60 = 360 reste un trimestre")

const ouvrage = factureDoLignes({
  primeAnnuelle: 1000,
  fraisGestion: 50,
  fraisCourtage: 25,
  montantPaye: 1075,
})
assert(ouvrage.prime === 1000 && ouvrage.fraisGestion === 50 && ouvrage.fraisCourtage === 25, "le DO détaille ses frais")
assert(ouvrage.total === 1075, "le total DO est le virement")
sums(ouvrage.prime + ouvrage.fraisCourtage, ouvrage.fraisGestion, ouvrage.total)

const ouvrageAjuste = factureDoLignes({
  primeAnnuelle: 1000,
  fraisGestion: 50,
  montantPaye: 900,
})
assert(ouvrageAjuste.prime === 900 && ouvrageAjuste.fraisGestion === 0, "un virement différent du devis est facturé tel quel")
assert(ouvrageAjuste.total === 900, "le total DO suit le virement reçu")

const sources = [
  "components/documents/FactureDecennaleTemplate.tsx",
  "lib/pdf-pages.tsx",
  "app/api/mollie/webhook/route.ts",
  "lib/insurance-contract-pdf.ts",
  "app/souscription/page.tsx",
  "app/signature/page.tsx",
]
  .map((file) => readFileSync(file, "utf8"))
  .join("\n")

assert(!sources.includes("Premier trimestre et frais de gestion"), "le modèle ne fige plus le trimestre")
assert(sources.includes("presenterFactureDecennale"), "l'écran relit les lignes de la facture")
assert(sources.includes("factureDecennaleLignes"), "le webhook et la facture contrat utilisent les mêmes lignes")
assert(sources.includes("prélevé par mois"), "la souscription affiche le mois qui sera facturé")
assert(sources.includes("€/mois"), "la signature affiche le prélèvement mensuel")

console.log("Factures alignées OK")
