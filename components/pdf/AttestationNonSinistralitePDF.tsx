import React from "react"
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10 },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: "#C65D3B",
    paddingBottom: 15,
    marginBottom: 20,
  },
  title: { fontSize: 18, color: "#C65D3B", marginBottom: 4 },
  subtitle: { fontSize: 9, color: "#6B6560" },
  h2: { fontSize: 14, marginBottom: 8, marginTop: 8, textAlign: "center" },
  h2sub: { fontSize: 11, marginBottom: 20, textAlign: "center", color: "#C65D3B" },
  numero: { textAlign: "center", marginBottom: 20 },
  p: { marginBottom: 6, lineHeight: 1.4 },
  section: {
    borderWidth: 2,
    borderColor: "#E5E0D8",
    padding: 24,
    marginBottom: 20,
  },
  footer: { marginTop: 20, fontSize: 9 },
})

function formatDateFr(iso: string): string {
  if (!iso) return ""
  const [y, m, d] = iso.split("-")
  return [d, m, y].filter(Boolean).join("/")
}

interface AttestationNonSinistralitePDFProps {
  numero: string
  data: {
    raisonSociale: string
    siret: string
    adresse?: string
    codePostal?: string
    ville?: string
    dateDebut: string
    dateFin: string
    motif: "jamais_assure" | "reprise_passe"
  }
}

export function AttestationNonSinistralitePDF({
  numero,
  data,
}: AttestationNonSinistralitePDFProps) {
  const dateDebutFr = formatDateFr(data.dateDebut)
  const dateFinFr = formatDateFr(data.dateFin)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Optimum Assurance</Text>
          <Text style={styles.subtitle}>Assurance décennale professionnelle</Text>
        </View>

        <Text style={styles.h2}>ATTESTATION DE NON SINISTRALITÉ</Text>
        <Text style={styles.h2sub}>Responsabilité Civile Décennale</Text>
        <Text style={styles.numero}>N° {numero}</Text>

        <View style={styles.section}>
          <Text style={styles.p}>
            La société Optimum Assurance atteste que :
          </Text>
          <Text style={[styles.p, { fontFamily: "Helvetica-Bold" }]}>
            {data.raisonSociale}
          </Text>
          <Text style={styles.p}>SIRET : {data.siret}</Text>
          {(data.adresse || data.codePostal || data.ville) && (
            <Text style={styles.p}>
              {[data.adresse, data.codePostal, data.ville].filter(Boolean).join(" ")}
            </Text>
          )}
          <Text style={styles.p}>
            n&apos;a déclaré aucun sinistre au titre de l&apos;assurance responsabilité
            civile décennale sur la période du {dateDebutFr} au {dateFinFr}.
          </Text>
          {data.motif === "jamais_assure" && (
            <Text style={[styles.p, { fontSize: 9, color: "#6B6560" }]}>
              Cette attestation est délivrée à la demande de l&apos;assuré, qui
              n&apos;avait jamais souscrit de contrat d&apos;assurance décennale avant
              la date de prise d&apos;effet du présent contrat.
            </Text>
          )}
          {data.motif === "reprise_passe" && (
            <Text style={[styles.p, { fontSize: 9, color: "#6B6560" }]}>
              Cette attestation concerne la période de reprise du passé (3 mois
              rétroactifs) prévue au contrat.
            </Text>
          )}
        </View>

        <Text style={styles.footer}>
          Fait à Paris, le {new Date().toLocaleDateString("fr-FR")}
        </Text>
        <Text style={[styles.footer, { marginTop: 8 }]}>Pour Optimum Assurance</Text>
      </Page>
    </Document>
  )
}
