/**
 * Chaque document imprimable doit sortir en PDF seul, avec son contenu,
 * sans la page du site.
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import { DocumentsCombinedPDF } from "@/components/pdf/DocumentsCombinedPDF"

const require = createRequire(import.meta.url)
const pdfjs = require("pdf-parse/lib/pdf.js/v2.0.550/build/pdf.js") as {
  getDocument: (src: { data: Uint8Array; disableWorker?: boolean }) => {
    promise: Promise<{
      numPages: number
      getPage: (n: number) => Promise<{
        getTextContent: () => Promise<{ items: Array<{ str?: string }> }>
      }>
    }>
  }
}

const activities = Array.from({ length: 8 }, (_, index) => `Activité impression ${index + 1}`)

type Sample = {
  type: string
  numero: string
  data: Record<string, unknown>
  must: RegExp[]
}

const samples: Sample[] = [
  {
    type: "devis",
    numero: "DEV-1",
    data: {
      raisonSociale: "Entreprise Devis",
      siret: "11111111111111",
      adresse: "1 rue du Devis",
      codePostal: "75001",
      ville: "Paris",
      activites: activities,
      primeAnnuelle: 2400,
      primeMensuelle: 200,
      franchise: 1000,
      plafond: 300000,
      chiffreAffaires: 150000,
      dateCreation: "01/01/2026",
    },
    must: [/DEVIS/, /Entreprise Devis/, /Activité impression 8/, /2[\s\u00a0\u202f]400/, /60\s+jours/, /Sous-traitance/],
  },
  {
    type: "devis_do",
    numero: "DO-1",
    data: {
      raisonSociale: "Maitre Ouvrage Test",
      adresseOperation: "12 chemin du Chantier, 33000 Bordeaux",
      coutConstruction: 180000,
      primeAnnuelle: 4200,
      closCouvert: false,
      lotsCouverts: ["gros_oeuvre"],
      dateCreation: "02/01/2026",
    },
    must: [/DEVIS/, /Maitre Ouvrage Test/, /12 chemin du Chantier/, /180[\s\u00a0\u202f]000/, /4[\s\u00a0\u202f]200/],
  },
  {
    type: "contrat",
    numero: "CTR-1",
    data: {
      raisonSociale: "Entreprise Contrat",
      siret: "22222222222222",
      activites: activities,
      primeAnnuelle: 2400,
      franchise: 1000,
      plafond: 300000,
      dateEffet: "01/01/2026",
      dateEcheance: "31/12/2026",
    },
    must: [/CONTRAT/, /Entreprise Contrat/, /Activité impression 8/, /RC Décennale/],
  },
  {
    type: "attestation",
    numero: "ATT-1",
    data: {
      raisonSociale: "Entreprise Attestation",
      siret: "33333333333333",
      activites: activities,
      primeAnnuelle: 2400,
      dateEffet: "01/01/2026",
      dateEcheance: "31/12/2026",
      chiffreAffaires: 150000,
    },
    must: [/ATTESTATION/, /Entreprise Attestation/, /Activité impression 8/, /TAMPON ASSUREUR/],
  },
  {
    type: "attestation_nominative",
    numero: "ATTN-1",
    data: {
      raisonSociale: "Entreprise Nominative",
      siret: "44444444444444",
      activites: ["Plomberie"],
      primeAnnuelle: 1800,
      dateEffet: "01/02/2026",
      dateEcheance: "31/12/2026",
      beneficiaireNom: "Mairie de Test",
      chantierAdresse: "Place de la Mairie",
    },
    must: [/NOMINATIVE/, /Mairie de Test/, /Place de la Mairie/],
  },
  {
    type: "attestation_do",
    numero: "ATTDO-1",
    data: {
      raisonSociale: "Ouvrage DO",
      adresseOperation: "5 avenue des Artisans, 44000 Nantes",
      coutConstruction: 250000,
      primeAnnuelle: 6100,
      dateSignature: "01/03/2026",
      dateEcheance: "01/03/2036",
      closCouvert: true,
    },
    must: [/Dommage Ouvrage/, /5 avenue des Artisans/, /250[\s\u00a0\u202f]000/, /Clos et couvert/],
  },
  {
    type: "attestation_non_sinistralite",
    numero: "NS-1",
    data: {
      raisonSociale: "Entreprise Sinistre",
      siret: "55555555555555",
      dateDebut: "2024-01-01",
      dateFin: "2025-12-31",
      motif: "reprise_passe",
    },
    must: [/NON-SINISTRALITÉ|NON SINISTRALITÉ/, /Entreprise Sinistre/, /01\/01\/2024/],
  },
  {
    type: "facture_decennale",
    numero: "FACD-1",
    data: {
      raisonSociale: "Entreprise Facture",
      siret: "66666666666666",
      primeAnnuelle: 2400,
      fraisGestion: 30,
      montantPremierTrimestre: 600,
      montantTotalPaye: 630,
      datePaiement: "15/01/2026",
    },
    must: [/FACTURE ACQUITTÉE/, /Entreprise Facture/, /630/],
  },
  {
    type: "facture_do",
    numero: "FACDO-1",
    data: {
      raisonSociale: "Facture Ouvrage",
      adresse: "8 rue du Règlement",
      primeAnnuelle: 5000,
      totalTTC: 5000,
      datePaiement: "20/01/2026",
      closCouvert: false,
    },
    must: [/FACTURE ACQUITTÉE/, /Facture Ouvrage/, /5[\s\u00a0\u202f]000/, /DO complète/],
  },
  {
    type: "avenant",
    numero: "AV-1",
    data: {
      raisonSociale: "Entreprise Avenant",
      siret: "77777777777777",
      contractNumero: "CTR-PARENT",
      motifAvenant: "Hausse du chiffre d'affaires",
      dateAvenant: "01/04/2026",
      chiffreAffaires: 200000,
      primeAnnuelle: 3100,
      activites: ["Couverture"],
    },
    must: [/AVENANT/, /CTR-PARENT/, /Hausse du chiffre d'affaires/, /Frais d'avenant : 60/, /Couverture/],
  },
]

async function pdfText(bytes: Uint8Array): Promise<string> {
  const doc = await pdfjs.getDocument({ data: bytes, disableWorker: true }).promise
  assert.ok(doc.numPages >= 1, "PDF vide")
  let text = ""
  for (let page = 1; page <= doc.numPages; page += 1) {
    const content = await (await doc.getPage(page)).getTextContent()
    text += content.items.map((item) => item.str || "").join(" ") + "\n"
  }
  return text
}

function assertPagesOpenPdfOnly() {
  for (const file of [
    "app/espace-client/documents/[id]/page.tsx",
    "app/gestion/documents/[id]/page.tsx",
  ]) {
    const source = readFileSync(file, "utf8")
    assert.equal(source.includes("window.print"), false, `${file} imprime encore la page du site`)
    assert.match(source, /\/api\/documents\/\$\{document\.id\}\/pdf\?inline=1/)
  }
}

async function main() {
  assertPagesOpenPdfOnly()
  for (const sample of samples) {
    const buffer = await renderToBuffer(
      React.createElement(DocumentsCombinedPDF, {
        documents: [{ id: sample.type, type: sample.type, numero: sample.numero, data: sample.data }],
      }) as Parameters<typeof renderToBuffer>[0]
    )
    const text = await pdfText(new Uint8Array(buffer))
    for (const pattern of sample.must) {
      assert.match(text, pattern, `${sample.type} ne contient pas ${pattern}`)
    }
    assert.doesNotMatch(text, /Consultez ce document en ligne|Métiers décennale|Imprimer \/ PDF/)
  }
  console.log("verify-document-print-pdf: ok")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
