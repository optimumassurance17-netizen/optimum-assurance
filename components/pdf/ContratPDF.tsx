import React from "react"
import { Document, Page, Text, View } from "@react-pdf/renderer"
import { pdfTheme, PdfBrandHeader } from "@/lib/pdf/react-pdf-brand"
import { pdfLegalLinksLine } from "@/lib/pdf-legal-links"
import { DEVOIR_CONSEIL_TEXT_BY_PRODUCT } from "@/lib/devoir-conseil"
import { DECENNALE_CUSTOM_LEGAL_CLAUSES } from "@/lib/decennale-legal-clauses"
import { extractStructuredActivities } from "@/lib/activity-hierarchy-format"

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
  const devoirConseil = DEVOIR_CONSEIL_TEXT_BY_PRODUCT.decennale
  const activities = extractStructuredActivities(data)
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
            {activities.length ? activities.join("\n") : "—"}.
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
        <Text style={[pdfTheme.p, { fontSize: 9, color: "#64748b", marginTop: 8 }]}>
          Suite des clauses contractuelles et signature en page suivante.
        </Text>
      </Page>

      <Page size="A4" style={pdfTheme.page}>
        <PdfBrandHeader tagline="Assurance décennale professionnelle — suite du contrat type" />
        <Text style={pdfTheme.h2}>CONTRAT D&apos;ASSURANCE DÉCENNALE — SUITE</Text>
        <Text style={[pdfTheme.p, { fontFamily: "Helvetica-Bold", color: "#1e40af" }]}>N° {numero}</Text>

        <View style={pdfTheme.section}>
          <Text style={pdfTheme.h3}>Article 7 - Étendue de la garantie et exclusions</Text>
          <Text style={pdfTheme.p}>
            La garantie couvre la responsabilité décennale de l&apos;assuré pour les dommages matériels relevant des
            dispositions légales applicables aux constructeurs, dans la limite des plafonds contractuels.
          </Text>
          <Text style={pdfTheme.p}>
            Restent notamment exclus les dommages résultant d&apos;une activité non déclarée, d&apos;une faute intentionnelle,
            d&apos;un défaut d&apos;entretien ou des exclusions prévues par les conditions générales.
          </Text>
        </View>

        <View style={pdfTheme.section}>
          <Text style={pdfTheme.h3}>Article 8 - Obligations du souscripteur</Text>
          <Text style={pdfTheme.p}>
            L&apos;assuré s&apos;engage à déclarer avec exactitude ses activités et son chiffre d&apos;affaires, à signaler toute
            modification significative (activité, structure, adresse, mode d&apos;intervention) et à régler les primes aux
            échéances prévues.
          </Text>
        </View>

        <View style={pdfTheme.section}>
          <Text style={pdfTheme.h3}>Article 9 - Déclaration de sinistre</Text>
          <Text style={pdfTheme.p}>
            Tout sinistre doit être déclaré dans les meilleurs délais avec les éléments utiles (référence chantier,
            description des dommages, date de survenance, pièces justificatives). L&apos;instruction suit les modalités
            prévues aux conditions générales.
          </Text>
        </View>

        <View style={pdfTheme.section}>
          <Text style={pdfTheme.h3}>Article 10 - Exclusions et déchéance de garantie</Text>
          {DECENNALE_CUSTOM_LEGAL_CLAUSES.map((clause, idx) => (
            <Text key={idx} style={pdfTheme.p}>
              {clause}
            </Text>
          ))}
        </View>

        <View style={pdfTheme.section}>
          <Text style={pdfTheme.h3}>Article 11 - Devoir de conseil</Text>
          <Text style={pdfTheme.p}>{devoirConseil.contenu}</Text>
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
