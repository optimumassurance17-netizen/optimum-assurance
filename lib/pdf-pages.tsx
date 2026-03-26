/**
 * Composants Page pour l'export PDF groupé.
 * Chaque composant retourne un <Page> (sans Document) pour être combiné.
 */
import React from "react"
import { Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer"

const sharedStyles = StyleSheet.create({
  page: { padding: 40, fontSize: 10 },
  header: { borderBottomWidth: 2, borderBottomColor: "#C65D3B", paddingBottom: 15, marginBottom: 20 },
  title: { fontSize: 18, color: "#C65D3B", marginBottom: 4 },
  subtitle: { fontSize: 9, color: "#333333" },
  h2: { fontSize: 14, marginBottom: 15, marginTop: 15 },
  h3: { fontSize: 11, marginBottom: 8, marginTop: 12 },
  p: { marginBottom: 6, lineHeight: 1.4 },
  section: { marginBottom: 12 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E5E0D8", paddingVertical: 6 },
  cellLeft: { flex: 1 },
  cellRight: { width: 100, textAlign: "right" },
})

export function ContratPDFPage({
  numero,
  data,
}: {
  numero: string
  data: Record<string, unknown>
}) {
  const d = data as {
    raisonSociale?: string
    siret?: string
    adresse?: string
    codePostal?: string
    ville?: string
    representantLegal?: string
    civilite?: string
    activites?: string[]
    primeAnnuelle?: number
    primeMensuelle?: number
    primeTrimestrielle?: number
    franchise?: number
    plafond?: number
    dateEffet?: string
    dateEcheance?: string
  }
  return (
    <Page size="A4" style={sharedStyles.page}>
      <View style={sharedStyles.header}>
        <Text style={sharedStyles.title}>Optimum Assurance</Text>
        <Text style={sharedStyles.subtitle}>Assurance décennale professionnelle</Text>
      </View>
      <Text style={sharedStyles.h2}>CONTRAT D&apos;ASSURANCE DÉCENNALE</Text>
      <Text style={sharedStyles.p}>N° {numero}</Text>
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.h3}>Article 1 - Parties</Text>
        <Text style={sharedStyles.p}>L&apos;Assuré : {d.raisonSociale ?? "—"}</Text>
        <Text style={sharedStyles.p}>SIRET : {d.siret ?? "—"}</Text>
        {(d.adresse || d.codePostal || d.ville) && (
          <Text style={sharedStyles.p}>{[d.adresse, d.codePostal, d.ville].filter(Boolean).join(" ")}</Text>
        )}
      </View>
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.h3}>Article 3 - Période</Text>
        <Text style={sharedStyles.p}>Du {d.dateEffet ?? "—"} au {d.dateEcheance ?? "—"}</Text>
      </View>
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.h3}>Article 4 - Conditions</Text>
        <View style={sharedStyles.row}>
          <Text style={sharedStyles.cellLeft}>Prime annuelle</Text>
          <Text style={sharedStyles.cellRight}>{(d.primeAnnuelle ?? 0).toLocaleString("fr-FR")} € TTC</Text>
        </View>
        <View style={sharedStyles.row}>
          <Text style={sharedStyles.cellLeft}>Franchise</Text>
          <Text style={sharedStyles.cellRight}>{(d.franchise ?? 0).toLocaleString("fr-FR")} €</Text>
        </View>
        <View style={sharedStyles.row}>
          <Text style={sharedStyles.cellLeft}>Plafond</Text>
          <Text style={sharedStyles.cellRight}>{(d.plafond ?? 0).toLocaleString("fr-FR")} €</Text>
        </View>
      </View>
    </Page>
  )
}

export function AttestationPDFPage({
  numero,
  data,
}: {
  numero: string
  data: Record<string, unknown>
}) {
  const d = data as {
    raisonSociale?: string
    siret?: string
    adresse?: string
    codePostal?: string
    ville?: string
    activites?: string[]
    primeAnnuelle?: number
    dateEffet?: string
    dateEcheance?: string
    verificationUrl?: string
    verificationQrDataUri?: string
  }
  return (
    <Page size="A4" style={sharedStyles.page}>
      <View style={sharedStyles.header}>
        <Text style={sharedStyles.title}>Optimum Assurance</Text>
        <Text style={sharedStyles.subtitle}>Assurance décennale professionnelle</Text>
      </View>
      <Text style={[sharedStyles.h2, { textAlign: "center" }]}>ATTESTATION D&apos;ASSURANCE</Text>
      <Text style={[sharedStyles.p, { textAlign: "center", marginBottom: 20 }]}>N° {numero}</Text>
      <View style={[sharedStyles.section, { borderWidth: 2, borderColor: "#E5E0D8", padding: 20 }]}>
        <Text style={sharedStyles.p}>La société Optimum Assurance atteste que :</Text>
        <Text style={[sharedStyles.p, { fontFamily: "Helvetica-Bold" }]}>{d.raisonSociale ?? "—"}</Text>
        <Text style={sharedStyles.p}>SIRET : {d.siret ?? "—"}</Text>
        {(d.adresse || d.codePostal || d.ville) && (
          <Text style={sharedStyles.p}>{[d.adresse, d.codePostal, d.ville].filter(Boolean).join(" ")}</Text>
        )}
        <Text style={sharedStyles.p}>
          est garantie au titre de l&apos;assurance responsabilité civile décennale pour les activités : {d.activites?.join(", ") ?? "—"}
        </Text>
        <Text style={sharedStyles.p}>Période : du {d.dateEffet ?? "—"} au {d.dateEcheance ?? "—"}</Text>
        <Text style={sharedStyles.p}>Prime annuelle : {(d.primeAnnuelle ?? 0).toLocaleString("fr-FR")} € TTC</Text>
        {d.verificationQrDataUri && (
          <View style={{ flexDirection: "row", marginTop: 14, alignItems: "flex-start" }}>
            <Image src={d.verificationQrDataUri} style={{ width: 72, height: 72, marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 8, marginBottom: 4, fontFamily: "Helvetica-Bold" }}>
                Vérification en ligne
              </Text>
              {d.verificationUrl ? (
                <Text style={{ fontSize: 7, lineHeight: 1.35, color: "#333333" }}>{d.verificationUrl}</Text>
              ) : null}
            </View>
          </View>
        )}
      </View>
    </Page>
  )
}

export function AttestationDoPDFPage({
  numero,
  data,
}: {
  numero: string
  data: Record<string, unknown>
}) {
  const d = data as {
    raisonSociale?: string
    adresseOperation?: string
    codePostal?: string
    ville?: string
    closCouvert?: boolean
    primeAnnuelle?: number
    dateSignature?: string
    dateEcheance?: string
    verificationUrl?: string
    verificationQrDataUri?: string
  }
  const typeGarantie = d.closCouvert ? "Clos et couvert" : "DO complète"
  return (
    <Page size="A4" style={sharedStyles.page}>
      <View style={sharedStyles.header}>
        <Text style={sharedStyles.title}>Optimum Assurance</Text>
        <Text style={sharedStyles.subtitle}>Assurance dommage ouvrage</Text>
      </View>
      <Text style={[sharedStyles.h2, { textAlign: "center" }]}>ATTESTATION D&apos;ASSURANCE</Text>
      <Text style={[sharedStyles.p, { textAlign: "center", color: "#C65D3B", marginBottom: 20 }]}>Dommage Ouvrage — N° {numero}</Text>
      <View style={[sharedStyles.section, { borderWidth: 2, borderColor: "#E5E0D8", padding: 20 }]}>
        <Text style={sharedStyles.p}>La société Optimum Assurance atteste que :</Text>
        <Text style={[sharedStyles.p, { fontFamily: "Helvetica-Bold" }]}>{d.raisonSociale ?? "—"}</Text>
        {(d.adresseOperation || d.codePostal || d.ville) && (
          <Text style={sharedStyles.p}>{[d.adresseOperation, d.codePostal, d.ville].filter(Boolean).join(", ")}</Text>
        )}
        <Text style={sharedStyles.p}>Type de garantie : {typeGarantie}</Text>
        <Text style={sharedStyles.p}>Validité : du {d.dateSignature ?? "—"} au {d.dateEcheance ?? "—"} (10 ans, non résiliable)</Text>
        <Text style={sharedStyles.p}>Prime : {(d.primeAnnuelle ?? 0).toLocaleString("fr-FR")} € TTC</Text>
        {d.verificationQrDataUri && (
          <View style={{ flexDirection: "row", marginTop: 14, alignItems: "flex-start" }}>
            <Image src={d.verificationQrDataUri} style={{ width: 72, height: 72, marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 8, marginBottom: 4, fontFamily: "Helvetica-Bold" }}>
                Vérification en ligne
              </Text>
              {d.verificationUrl ? (
                <Text style={{ fontSize: 7, lineHeight: 1.35, color: "#333333" }}>{d.verificationUrl}</Text>
              ) : null}
            </View>
          </View>
        )}
      </View>
    </Page>
  )
}

export function FactureDoPDFPage({
  numero,
  data,
}: {
  numero: string
  data: Record<string, unknown>
}) {
  const d = data as {
    raisonSociale?: string
    adresse?: string
    codePostal?: string
    ville?: string
    closCouvert?: boolean
    primeAnnuelle?: number
    totalTTC?: number
    datePaiement?: string
  }
  const typeGarantie = d.closCouvert ? "Clos et couvert" : "DO complète"
  return (
    <Page size="A4" style={sharedStyles.page}>
      <View style={sharedStyles.header}>
        <Text style={sharedStyles.title}>Optimum Assurance</Text>
        <Text style={sharedStyles.subtitle}>Assurance dommage ouvrage</Text>
      </View>
      <Text style={[sharedStyles.h2, { textAlign: "center" }]}>FACTURE ACQUITTÉE</Text>
      <Text style={[sharedStyles.p, { textAlign: "center", marginBottom: 20 }]}>N° {numero} — {d.datePaiement ?? ""}</Text>
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.p}>Client : {d.raisonSociale ?? "—"}</Text>
        {(d.adresse || d.codePostal || d.ville) && (
          <Text style={sharedStyles.p}>{[d.adresse, d.codePostal, d.ville].filter(Boolean).join(", ")}</Text>
        )}
      </View>
      <View style={sharedStyles.section}>
        <View style={sharedStyles.row}>
          <Text style={sharedStyles.cellLeft}>Assurance DO — {typeGarantie}</Text>
          <Text style={sharedStyles.cellRight}>{(d.primeAnnuelle ?? 0).toLocaleString("fr-FR")} €</Text>
        </View>
        <View style={sharedStyles.row}>
          <Text style={sharedStyles.cellLeft}>Total TTC</Text>
          <Text style={sharedStyles.cellRight}>{(d.totalTTC ?? d.primeAnnuelle ?? 0).toLocaleString("fr-FR")} €</Text>
        </View>
      </View>
    </Page>
  )
}

export function AttestationNonSinistralitePDFPage({
  numero,
  data,
}: {
  numero: string
  data: Record<string, unknown>
}) {
  const d = data as {
    raisonSociale?: string
    siret?: string
    adresse?: string
    codePostal?: string
    ville?: string
    dateDebut?: string
    dateFin?: string
    motif?: string
  }
  const formatDate = (s: string) => {
    if (!s) return ""
    const [y, m, day] = s.split("-")
    return [day, m, y].filter(Boolean).join("/")
  }
  return (
    <Page size="A4" style={sharedStyles.page}>
      <View style={sharedStyles.header}>
        <Text style={sharedStyles.title}>Optimum Assurance</Text>
        <Text style={sharedStyles.subtitle}>Assurance décennale professionnelle</Text>
      </View>
      <Text style={[sharedStyles.h2, { textAlign: "center" }]}>ATTESTATION DE NON SINISTRALITÉ</Text>
      <Text style={[sharedStyles.p, { textAlign: "center", marginBottom: 20 }]}>N° {numero}</Text>
      <View style={[sharedStyles.section, { borderWidth: 2, borderColor: "#E5E0D8", padding: 20 }]}>
        <Text style={sharedStyles.p}>La société Optimum Assurance atteste que {d.raisonSociale ?? "—"} (SIRET : {d.siret ?? "—"}) n&apos;a déclaré aucun sinistre sur la période du {formatDate(d.dateDebut ?? "")} au {formatDate(d.dateFin ?? "")}.</Text>
      </View>
    </Page>
  )
}

/** Page générique pour devis, avenant, devis_do sans template PDF dédié */
export function DocumentResumePDFPage({
  type,
  numero,
  data,
}: {
  type: string
  numero: string
  data: Record<string, unknown>
}) {
  const labels: Record<string, string> = {
    devis: "Devis décennale",
    devis_do: "Devis dommage ouvrage",
    avenant: "Avenant",
  }
  const d = data as { raisonSociale?: string; primeAnnuelle?: number; dateEffet?: string }
  return (
    <Page size="A4" style={sharedStyles.page}>
      <View style={sharedStyles.header}>
        <Text style={sharedStyles.title}>Optimum Assurance</Text>
        <Text style={sharedStyles.subtitle}>{labels[type] || type}</Text>
      </View>
      <Text style={sharedStyles.h2}>{labels[type] || type}</Text>
      <Text style={sharedStyles.p}>N° {numero}</Text>
      {d.raisonSociale && <Text style={sharedStyles.p}>Client : {d.raisonSociale}</Text>}
      {d.primeAnnuelle != null && <Text style={sharedStyles.p}>Prime : {d.primeAnnuelle.toLocaleString("fr-FR")} € TTC</Text>}
      {d.dateEffet && <Text style={sharedStyles.p}>Date d&apos;effet : {d.dateEffet}</Text>}
      <Text style={[sharedStyles.p, { marginTop: 20, fontSize: 9, color: "#333333" }]}>
        Consultez ce document en ligne dans votre espace client pour les détails complets.
      </Text>
    </Page>
  )
}
