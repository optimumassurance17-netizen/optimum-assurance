import React from "react"
import { Document, Image, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import {
  ACCELERANT_LOGO_HEIGHT_PT,
  ACCELERANT_LOGO_WIDTH_PT,
  getAccelerantLogoDataUriSync,
} from "@/lib/pdf/shared/accelerantLogoDataUri"
import { COMPANY_BRAND, INSURER_NAME } from "@/lib/legal-branding"

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10 },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
    paddingBottom: 15,
    marginBottom: 20,
    alignItems: "center",
  },
  logoImage: {
    width: ACCELERANT_LOGO_WIDTH_PT,
    height: ACCELERANT_LOGO_HEIGHT_PT,
    marginBottom: 12,
    objectFit: "contain" as const,
  },
  title: { fontSize: 18, color: "#2563eb", marginBottom: 4 },
  subtitle: { fontSize: 9, color: "#333333" },
  h2: { fontSize: 14, marginBottom: 8, marginTop: 8, textAlign: "center" },
  h2sub: { fontSize: 11, marginBottom: 20, textAlign: "center", color: "#2563eb" },
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
  const accelerantLogoUri = getAccelerantLogoDataUriSync()

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {accelerantLogoUri ? (
            /* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/Image : logo marque */
            <Image src={accelerantLogoUri} style={styles.logoImage} />
          ) : null}
          <Text style={styles.title}>{COMPANY_BRAND}</Text>
          <Text style={styles.subtitle}>Assurance décennale professionnelle</Text>
        </View>

        <Text style={styles.h2}>
          {data.motif === "reprise_passe"
            ? "ATTESTATION SUR L'HONNEUR DE NON-SINISTRALITÉ"
            : "ATTESTATION DE NON SINISTRALITÉ"}
        </Text>
        <Text style={styles.h2sub}>Responsabilité Civile Décennale</Text>
        <Text style={styles.numero}>N° {numero}</Text>

        <View style={styles.section}>
          {data.motif === "reprise_passe" ? (
            <Text style={styles.p}>
              Je soussigné, représentant de {data.raisonSociale} (SIRET : {data.siret}), déclare
              sur l&apos;honneur n&apos;avoir déclaré aucun sinistre au titre de l&apos;assurance
              responsabilité civile décennale du {dateDebutFr} au {dateFinFr}.
            </Text>
          ) : (
            <>
              <Text style={styles.p}>
                La société {COMPANY_BRAND} atteste que :
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
            </>
          )}
          {data.motif === "jamais_assure" && (
            <Text style={[styles.p, { fontSize: 9, color: "#333333" }]}>
              Cette attestation est délivrée à la demande de l&apos;assuré, qui
              n&apos;avait jamais souscrit de contrat d&apos;assurance décennale avant
              la date de prise d&apos;effet du présent contrat.
            </Text>
          )}
          {data.motif === "reprise_passe" && (
            <Text style={[styles.p, { fontSize: 9, color: "#333333" }]}>
              Date de reprise du passé : {dateDebutFr}. Cette déclaration couvre la
              reprise du passé, au plus 3 mois avant l&apos;autorisation.
            </Text>
          )}
        </View>

        {data.motif === "reprise_passe" ? (
          <>
            <Text style={styles.footer}>Fait le {new Date().toLocaleDateString("fr-FR")}</Text>
            <Text style={[styles.footer, { marginTop: 8 }]}>Le déclarant : {data.raisonSociale}</Text>
          </>
        ) : (
          <>
            <Text style={styles.footer}>Fait à Paris, le {new Date().toLocaleDateString("fr-FR")}</Text>
            <Text style={[styles.footer, { marginTop: 8 }]}>
              Pour {COMPANY_BRAND} — Assureur : {INSURER_NAME}
            </Text>
          </>
        )}
      </Page>
    </Document>
  )
}
