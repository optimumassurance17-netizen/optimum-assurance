import React from "react"
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import { pdfLegalLinksLine } from "@/lib/pdf-legal-links"

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10 },
  header: { borderBottomWidth: 2, borderBottomColor: "#2563eb", paddingBottom: 15, marginBottom: 20 },
  title: { fontSize: 18, color: "#2563eb", marginBottom: 4 },
  subtitle: { fontSize: 9, color: "#333333" },
  h2: { fontSize: 14, marginBottom: 15, marginTop: 15 },
  h3: { fontSize: 11, marginBottom: 8, marginTop: 12 },
  p: { marginBottom: 6, lineHeight: 1.4 },
  section: { marginBottom: 12 },
  table: { marginTop: 8 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E5E0D8", paddingVertical: 6 },
  cellLeft: { flex: 1 },
  cellRight: { width: 100, textAlign: "right" },
  signatureZone: { marginTop: 40, paddingTop: 20, borderTopWidth: 1, borderTopColor: "#E5E0D8" },
})

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
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Optimum Assurance</Text>
          <Text style={styles.subtitle}>Assurance décennale professionnelle</Text>
        </View>

        <Text style={styles.h2}>CONTRAT D&apos;ASSURANCE DÉCENNALE</Text>
        <Text style={styles.p}>N° {numero}</Text>

        <View style={styles.section}>
          <Text style={styles.h3}>Article 1 - Parties</Text>
          <Text style={styles.p}>L&apos;Assureur : Optimum Assurance</Text>
          <Text style={styles.p}>L&apos;Assuré : {data.raisonSociale}</Text>
          <Text style={styles.p}>SIRET : {data.siret}</Text>
          {(data.adresse || data.codePostal || data.ville) && (
            <Text style={styles.p}>{[data.adresse, data.codePostal, data.ville].filter(Boolean).join(" ")}</Text>
          )}
          <Text style={styles.p}>Représenté par : {data.civilite || ""} {data.representantLegal || "—"}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h3}>Article 2 - Objet</Text>
          <Text style={styles.p}>
            Le présent contrat garantit la responsabilité civile décennale de l&apos;assuré pour les activités : {data.activites?.join(", ") || "—"}.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h3}>Article 3 - Période de garantie</Text>
          <Text style={styles.p}>Du {data.dateEffet} au {data.dateEcheance}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h3}>Article 4 - Conditions financières</Text>
          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={styles.cellLeft}>Prime annuelle</Text>
              <Text style={styles.cellRight}>{(data.primeAnnuelle ?? 0).toLocaleString("fr-FR")} € TTC</Text>
            </View>
            {data.modePaiement === "prelevement" && (
              <>
                <View style={styles.row}>
                  <Text style={styles.cellLeft}>Mode de paiement</Text>
                  <Text style={styles.cellRight}>Prélèvement trimestriel</Text>
                </View>
                {data.fraisGestionPrelevement != null && (
                  <View style={styles.row}>
                    <Text style={styles.cellLeft}>Frais de gestion (1er prélèvement)</Text>
                    <Text style={styles.cellRight}>{data.fraisGestionPrelevement} €</Text>
                  </View>
                )}
                <View style={styles.row}>
                  <Text style={styles.cellLeft}>Montant par échéance trimestrielle</Text>
                  <Text style={styles.cellRight}>
                    {(
                      data.primeTrimestrielle ??
                      (data.primeAnnuelle != null ? Math.round((data.primeAnnuelle / 4) * 100) / 100 : 0)
                    ).toLocaleString("fr-FR")}{" "}
                    €
                  </Text>
                </View>
                {data.primeAnnuelle != null && (
                  <View style={styles.row}>
                    <Text style={styles.cellLeft}>Équivalent mensuel (indicatif, prime ÷ 12)</Text>
                    <Text style={styles.cellRight}>
                      {Math.round((data.primeAnnuelle / 12) * 100) / 100} €
                    </Text>
                  </View>
                )}
              </>
            )}
            <View style={styles.row}>
              <Text style={styles.cellLeft}>Franchise</Text>
              <Text style={styles.cellRight}>{(data.franchise ?? 0).toLocaleString("fr-FR")} €</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cellLeft}>Plafond de garantie</Text>
              <Text style={styles.cellRight}>{(data.plafond ?? 0).toLocaleString("fr-FR")} €</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.h3}>Article 5 - Déclaration</Text>
          <Text style={styles.p}>Chiffre d&apos;affaires annuel déclaré : {data.chiffreAffaires?.toLocaleString("fr-FR")} €</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h3}>Article 6 - Résiliation</Text>
          <Text style={styles.p}>
            Les demandes de résiliation doivent être adressées par lettre recommandée au plus tard 2 mois avant la date d&apos;échéance (31 décembre). Un minimum d&apos;un an de contrat est requis.
          </Text>
        </View>

        <View style={styles.signatureZone}>
          <Text style={styles.p}>Signature du représentant légal :</Text>
          <Text style={[styles.p, { fontSize: 9, color: "#333333", marginTop: 8 }]}>
            {data.civilite || ""} {data.representantLegal || "—"}
          </Text>
        </View>

        <View style={{ marginTop: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E5E0D8" }}>
          <Text style={{ fontSize: 8, color: "#333333", lineHeight: 1.35, marginBottom: 4 }}>
            Les conditions générales du contrat sont annexées et font partie intégrante du présent contrat.
          </Text>
          <Text style={{ fontSize: 8, color: "#555555", lineHeight: 1.35 }}>
            {pdfLegalLinksLine()}
          </Text>
          <Text style={{ fontSize: 8, color: "#555555", marginTop: 6, lineHeight: 1.35 }}>
            Optimum Courtage agit par délégation de Axcelrant Insurance.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
