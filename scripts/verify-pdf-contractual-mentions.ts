import assert from "node:assert/strict"
// @ts-expect-error - pdf-parse n'expose pas de types fiables dans cet environnement
import pdfParse from "pdf-parse"
import { generateDecennaleQuotePolicyBundle } from "@/lib/pdf/decennale/generateQuotePolicyBundle"
import { generateDOQuotePolicyBundle } from "@/lib/pdf/do/generateQuotePolicyBundle"
import { renderContractPdf } from "@/lib/insurance-contract-pdf"
import {
  buildAssuranceTitreContractConfig,
  serializeAssuranceTitreContractConfig,
} from "@/lib/assurance-titre-contract-config"
import type { InsuranceData } from "@/lib/pdf/types"
import type { InsuranceContract } from "@/lib/prisma-client"

type MentionCheck = {
  label: string
  regex: RegExp
}

const DEVOIR_CONSEIL_ONLY: MentionCheck[] = [
  { label: "mention devoir de conseil", regex: /devoir\s+de\s+conseil/i },
]

const DECENNALE_MENTIONS: MentionCheck[] = [
  ...DEVOIR_CONSEIL_ONLY,
  { label: "article L.241-1", regex: /L\.241-1/ },
  { label: "maintien de la garantie", regex: /maintien de la garantie/i },
  { label: "sans prime subséquente", regex: /prime subs.quente/i },
  { label: "franchise non opposable", regex: /n'est pas opposable/i },
  { label: "forclusion 1792-4-1", regex: /1792-4-1/ },
  { label: "inobservation inexcusable", regex: /inobservation inexcusable/i },
  { label: "annexe I", regex: /annexe I/i },
  { label: "article L.113-12", regex: /L\.113-12/ },
]

const DO_QUOTE_MENTIONS: MentionCheck[] = [
  ...DEVOIR_CONSEIL_ONLY,
  { label: "article L.242-1", regex: /L\.?\s*242-1/i },
  { label: "validité 90 jours", regex: /90 jours/i },
  { label: "ajustement de prime au-delà de 10 %", regex: /10\s*%/ },
  { label: "mention Bon pour accord", regex: /Bon pour accord/i },
  { label: "questionnaire d'étude", regex: /questionnaire d'.tude/i },
  { label: "pièces de fin de chantier", regex: /d.claration d'ach.vement/i },
  { label: "médiation de l'assurance", regex: /M.diation de l'Assurance/i },
  { label: "prescription L.114-1", regex: /L\.114-1/ },
  { label: "contrôle ACPR", regex: /ACPR/ },
  { label: "délai de position sinistre", regex: /60 jours/ },
  { label: "sanction L.243-3", regex: /L\.243-3/ },
  { label: "réception article 1792-6", regex: /1792-6/ },
  { label: "intérêts au double du taux légal", regex: /double du taux de l'int.r.t l.gal/i },
  { label: "subrogation", regex: /subrog/i },
  { label: "clauses types A.243-1", regex: /A\.243-1/ },
  { label: "déclaration réputée constituée", regex: /r.put.e constitu.e/i },
  { label: "délai supplémentaire 135 jours", regex: /cent trente-cinq/i },
  { label: "récusation de l'expert", regex: /r.cuser/i },
  { label: "L.113-16 inapplicable", regex: /L\.113-16/ },
  { label: "plancher R.243-3", regex: /R\.243-3/ },
  { label: "article 1792-5", regex: /1792-5/ },
]

const RC_FAB_MENTIONS: MentionCheck[] = [
  { label: "mention protection juridique", regex: /protection\s+juridique/i },
  { label: "montant protection juridique 20 000", regex: /20[\s\u00a0\u202f]*000/i },
  { label: "mention devoir de conseil", regex: /devoir\s+de\s+conseil/i },
  { label: "responsabilité du fait des produits", regex: /1245-15/ },
  { label: "déclenchement par le fait dommageable", regex: /L\.124-5/ },
  { label: "franchise opposable", regex: /franchise\s+contractuelle\s+est\s+opposable/i },
  { label: "prescription L.114-1", regex: /L\.114-1/ },
]

const ASSURANCE_TITRE_MENTIONS: MentionCheck[] = [
  { label: "mention Assurance titre", regex: /assurance\s+titre/i },
  { label: "mention devoir de conseil", regex: /devoir\s+de\s+conseil/i },
  { label: "principe indemnitaire L.121-1", regex: /L\.121-1/ },
  { label: "ne remplace pas le notaire", regex: /ne\s+remplace\s+pas/i },
  { label: "prescription L.114-1", regex: /L\.114-1/ },
]

function normalizeExtractedPdfText(input: string): string {
  return input
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
}

async function extractPdfText(pdfBytes: Uint8Array): Promise<string> {
  const parsed = await pdfParse(Buffer.from(pdfBytes))
  return normalizeExtractedPdfText(parsed.text || "")
}

function assertMentions(text: string, sourceLabel: string, checks: MentionCheck[]): void {
  for (const check of checks) {
    assert.match(
      text,
      check.regex,
      `PDF "${sourceLabel}" invalide: ${check.label} absente.`
    )
  }
}

function sampleDecennaleData(): InsuranceData {
  return {
    productType: "decennale",
    clientName: "Entreprise Test Decennale",
    siret: "12345678901234",
    address: "10 rue de Test, 75001 Paris",
    activities: ["Maconnerie generale", "Couverture"],
    startDate: "01/01/2026",
    endDate: "31/12/2026",
    premium: 2400,
    contractNumber: "QA-DEC-0001",
    createdAt: new Date("2026-01-01T10:00:00.000Z").toISOString(),
  }
}

function sampleDoData(): InsuranceData {
  return {
    productType: "do",
    clientName: "Maitre Ouvrage Test",
    address: "5 avenue Chantier, 33000 Bordeaux",
    projectName: "Construction maison individuelle",
    projectAddress: "12 chemin des Artisans, 33000 Bordeaux",
    constructionNature: "Maison individuelle",
    startDate: "01/02/2026",
    endDate: "01/02/2027",
    premium: 5800,
    contractNumber: "QA-DO-0001",
    createdAt: new Date("2026-01-02T10:00:00.000Z").toISOString(),
  }
}

function sampleRcFabContract(): InsuranceContract {
  return {
    id: "qa-rcfab-1",
    userId: "qa-user-1",
    productType: "rc_fabriquant",
    contractNumber: "QA-RCFAB-0001",
    clientName: "Fabricant Test",
    siret: "12345678901234",
    address: "8 rue de l Industrie, 69000 Lyon",
    activitiesJson: JSON.stringify(["Fabrication d'equipements"]),
    exclusionsJson: JSON.stringify([]),
    projectName: null,
    projectAddress: null,
    constructionNature: null,
    premium: 3600,
    status: "pending",
    validFrom: null,
    validUntil: null,
    paidAt: null,
    insurerValidatedAt: null,
    riskScore: null,
    rejectedReason: null,
    createdAt: new Date("2026-01-03T10:00:00.000Z"),
    updatedAt: new Date("2026-01-03T10:00:00.000Z"),
    molliePaymentId: null,
    paymentStatus: null,
    signedQuoteStorageKey: null,
    reminderSentAt: null,
    reminderAt: null,
  } as unknown as InsuranceContract
}

function sampleAssuranceTitreContract(): InsuranceContract {
  const config = buildAssuranceTitreContractConfig({
    referenceContrat: "QA-TIT-0001",
    primeAnnuelleTtc: 1800,
    primeAnnuelleHt: 1500,
    coverageDurationYears: 10,
    dossier: {
      contactName: "Claire Martin",
      structureName: "SCI Demo",
      propertyAddress: "22 rue du Titre",
      propertyPostalCode: "33000",
      propertyCity: "Bordeaux",
      operationLabel: "Acquisition",
      propertyTypeLabel: "Immeuble",
      needLabel: "Securisation de la transaction",
      capitalAmount: 450000,
      riskLabels: ["Servitude contestee"],
      parties: ["Notaire: Maitre Test", "Vendeur: Societe Exemple"],
      availableDocuments: ["Titre de propriete", "Projet d'acte"],
    },
  })

  return {
    id: "qa-titre-1",
    userId: "qa-user-2",
    productType: "assurance_titre",
    contractNumber: "QA-TIT-0001",
    clientName: "Claire Martin",
    siret: null,
    address: "22 rue du Titre, 33000 Bordeaux",
    activitiesJson: JSON.stringify([]),
    exclusionsJson: serializeAssuranceTitreContractConfig(config),
    projectName: null,
    projectAddress: null,
    constructionNature: null,
    premium: 1800,
    status: "active",
    validFrom: new Date("2026-02-01T10:00:00.000Z"),
    validUntil: new Date("2036-02-01T10:00:00.000Z"),
    paidAt: new Date("2026-02-01T10:00:00.000Z"),
    insurerValidatedAt: new Date("2026-02-01T10:00:00.000Z"),
    riskScore: null,
    rejectedReason: null,
    createdAt: new Date("2026-02-01T10:00:00.000Z"),
    updatedAt: new Date("2026-02-01T10:00:00.000Z"),
    molliePaymentId: null,
    paymentStatus: "paid",
    signedQuoteStorageKey: null,
    reminderSentAt: null,
    reminderAt: null,
  } as unknown as InsuranceContract
}

async function main(): Promise<void> {
  const decQuotePolicyPdf = await generateDecennaleQuotePolicyBundle(sampleDecennaleData(), "proposition")
  const doQuotePolicyPdf = await generateDOQuotePolicyBundle(sampleDoData(), "proposition")
  const rcFabPolicyPdf = await renderContractPdf(sampleRcFabContract(), "policy")
  const rcFabFicPdf = await renderContractPdf(sampleRcFabContract(), "fic")
  const assuranceTitrePolicyPdf = await renderContractPdf(sampleAssuranceTitreContract(), "policy")
  const assuranceTitreCertificatePdf = await renderContractPdf(
    sampleAssuranceTitreContract(),
    "certificate"
  )

  const decText = await extractPdfText(decQuotePolicyPdf)
  const doText = await extractPdfText(doQuotePolicyPdf)
  const rcFabText = await extractPdfText(rcFabPolicyPdf)
  const rcFabFicText = await extractPdfText(rcFabFicPdf)
  const assuranceTitrePolicyText = await extractPdfText(assuranceTitrePolicyPdf)
  const assuranceTitreCertificateText = await extractPdfText(assuranceTitreCertificatePdf)

  assertMentions(decText, "devis+conditions particulières décennale", DECENNALE_MENTIONS)
  assertMentions(doText, "devis+conditions particulières dommage-ouvrage", DO_QUOTE_MENTIONS)
  assertMentions(rcFabText, "conditions RC Fabriquant", RC_FAB_MENTIONS)
  assertMentions(rcFabFicText, "FIC RC Fabriquant", RC_FAB_MENTIONS)
  assertMentions(
    assuranceTitrePolicyText,
    "conditions particulières Assurance titre",
    ASSURANCE_TITRE_MENTIONS
  )
  assertMentions(
    assuranceTitreCertificateText,
    "attestation Assurance titre",
    ASSURANCE_TITRE_MENTIONS
  )

  console.log(
    "OK: Mentions contractuelles PDF conformes (devoir de conseil + protection juridique + Assurance titre)."
  )
}

main().catch((error) => {
  console.error("Echec vérification mentions PDF:", error)
  process.exit(1)
})
