import React from "react"
import { Document, Page, Text, View } from "@react-pdf/renderer"
import { pdfTheme, PdfBrandHeader } from "@/lib/pdf/react-pdf-brand"
import { pdfLegalLinksLine } from "@/lib/pdf-legal-links"

interface ContratPDFProps {
  numero: string
  data: {
    raisonSociale: string
    siret: string
    adresse?: string
    codePostal?: string
    ville?: string
    representantLegal?: string
    civilite?: string
    activites: string[]
    chiffreAffaires: number
    primeAnnuelle: number
    primeMensuelle?: number
    primeTrimestrielle?: number
    modePaiement?: string
    periodicitePrelevement?: string
    fraisGestionPrelevement?: number
    franchise: number
    plafond: number
    dateEffet: string
    dateEcheance: string
  }
}

export function ContratPDF({ numero, data }: ContratPDFProps) {
  return (
    <Document>
      <Page size="A4" style={pdfTheme.page}>
        <PdfBrandHeader tagline="Assurance décennale professionnelle — contrat type" />

        <Text style={pdfTheme.h2}>CONTRAT D&apos;ASSURANCE DÉCENNALE</Text>
        <Text style={[pdfTheme.p, { fontFamily: "Helvetica-Bold", color: "#1e40af" }]}>N° {numero}</Text>

        <View style={pdfTheme.section}>
          <Text style={pdfTheme.h3}>Article 1 - Parties</Text>
          <Text style={pdfTheme.p}>L&apos;Assureur : Optimum Assurance</Text>
          <Text style={pdfTheme.p}>L&apos;Assuré : {data.raisonSociale}</Text>
          <Text style={pdfTheme.p}>SIRET : {data.siret}</Text>
          {(data.adresse || data.codePostal || data.ville) && (
            <Text style={pdfTheme.p}>{[data.adresse, data.codePostal, data.ville].filter(Boolean).join(" ")}</Text>
          )}
          <Text style={pdfTheme.p}>
            Représenté par : {data.civilite || ""} {data.representantLegal || "—"}
          </Text>
        </View>

        <View style={pdfTheme.section}>
          <Text style={pdfTheme.h3}>Article 2 - Objet</Text>
          <Text style={pdfTheme.p}>
            Le présent contrat garantit la responsabilité civile décennale de l&apos;assuré pour les activités :{" "}
            {data.activites?.join(", ") || "—"}.
          </Text>
        </View>

        <View style={pdfTheme.section}>
          <Text style={pdfTheme.h3}>Article 3 - Période de garantie</Text>
          <Text style={pdfTheme.p}>
            Du {data.dateEffet} au {data.dateEcheance}
          </Text>
        </View>

        <View style={pdfTheme.section}>
          <Text style={pdfTheme.h3}>Article 4 - Conditions financières</Text>
          <View style={pdfTheme.tableCard}>
            <View style={pdfTheme.tableHeader}>
              <Text style={pdfTheme.tableHeaderText}>Montants et modalités</Text>
            </View>
            <View style={pdfTheme.row}>
              <Text style={pdfTheme.cellLeft}>Prime annuelle</Text>
              <Text style={pdfTheme.cellRight}>{(data.primeAnnuelle ?? 0).toLocaleString("fr-FR")} € TTC</Text>
            </View>
            {data.modePaiement === "prelevement" && (
              <>
                <View style={pdfTheme.row}>
                  <Text style={pdfTheme.cellLeft}>Mode de paiement</Text>
                  <Text style={pdfTheme.cellRight}>Prélèvement trimestriel</Text>
                </View>
                {data.fraisGestionPrelevement != null && (
                  <View style={pdfTheme.row}>
                    <Text style={pdfTheme.cellLeft}>Frais de gestion (1er prélèvement)</Text>
                    <Text style={pdfTheme.cellRight}>{data.fraisGestionPrelevement} €</Text>
                  </View>
                )}
                <View style={pdfTheme.row}>
                  <Text style={pdfTheme.cellLeft}>Montant par échéance trimestrielle</Text>
                  <Text style={pdfTheme.cellRight}>
                    {(
                      data.primeTrimestrielle ??
                      (data.primeAnnuelle != null ? Math.round((data.primeAnnuelle / 4) * 100) / 100 : 0)
                    ).toLocaleString("fr-FR")}{" "}
                    €
                  </Text>
                </View>
                {data.primeAnnuelle != null && (
                  <View style={pdfTheme.row}>
                    <Text style={pdfTheme.cellLeft}>Équivalent mensuel (indicatif, prime ÷ 12)</Text>
                    <Text style={pdfTheme.cellRight}>{Math.round((data.primeAnnuelle / 12) * 100) / 100} €</Text>
                  </View>
                )}
              </>
            )}
            <View style={pdfTheme.row}>
              <Text style={pdfTheme.cellLeft}>Franchise</Text>
              <Text style={pdfTheme.cellRight}>{(data.franchise ?? 0).toLocaleString("fr-FR")} €</Text>
            </View>
            <View style={pdfTheme.rowLast}>
              <Text style={pdfTheme.cellLeft}>Plafond de garantie</Text>
              <Text style={pdfTheme.cellRight}>{(data.plafond ?? 0).toLocaleString("fr-FR")} €</Text>
            </View>
          </View>
        </View>

        <View style={pdfTheme.section}>
          <Text style={pdfTheme.h3}>Article 5 - Déclaration</Text>
          <Text style={pdfTheme.p}>
            Chiffre d&apos;affaires annuel déclaré : {data.chiffreAffaires?.toLocaleString("fr-FR")} €
          </Text>
        </View>

        <View style={pdfTheme.section}>
          <Text style={pdfTheme.h3}>Article 6 - Résiliation</Text>
          <Text style={pdfTheme.p}>
            Les demandes de résiliation doivent être adressées par lettre recommandée au plus tard 2 mois avant la date
            d&apos;échéance (31 décembre). Un minimum d&apos;un an de contrat est requis.
          </Text>
        </View>

        <View style={pdfTheme.signatureZone}>
          <Text style={[pdfTheme.p, { fontFamily: "Helvetica-Bold" }]}>Signature du représentant légal</Text>
          <Text style={[pdfTheme.p, { fontSize: 9, color: "#475569", marginTop: 6 }]}>
            {data.civilite || ""} {data.representantLegal || "—"}
          </Text>
        </View>

        <View style={pdfTheme.legalBlock}>
          <Text style={pdfTheme.legalText}>
            Les conditions générales du contrat sont annexées et font partie intégrante du présent contrat.
          </Text>
          <Text style={[pdfTheme.legalText, { marginTop: 6 }]}>{pdfLegalLinksLine()}</Text>
          <Text style={[pdfTheme.legalText, { marginTop: 8 }]}>
            Optimum Courtage agit par délégation de Accelerant Insurance.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
