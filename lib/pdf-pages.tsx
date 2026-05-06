/**
 * Composants Page pour l'export PDF groupé.
 * Chaque composant retourne un <Page> (sans Document) pour être combiné.
 */
import React from "react"
import { Page, Text, View, Image } from "@react-pdf/renderer"
import { pdfLegalLinksLine } from "@/lib/pdf-legal-links"
import { pdfTheme, PdfBrandHeader } from "@/lib/pdf/react-pdf-brand"
import { extractStructuredActivities } from "@/lib/activity-hierarchy-format"
import { extractOptimizedExclusionLines } from "@/lib/optimized-exclusions"

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
  const activities = extractStructuredActivities(d)
  return (
    <Page size="A4" style={pdfTheme.page}>
      <PdfBrandHeader tagline="Assurance décennale professionnelle — extrait contrat" />
      <Text style={pdfTheme.h2}>CONTRAT D&apos;ASSURANCE DÉCENNALE</Text>
      <Text style={[pdfTheme.p, { fontFamily: "Helvetica-Bold", color: "#1e40af" }]}>N° {numero}</Text>
      <View style={pdfTheme.section}>
        <Text style={pdfTheme.h3}>Article 1 - Parties</Text>
        <Text style={pdfTheme.p}>L&apos;Assuré : {d.raisonSociale ?? "—"}</Text>
        <Text style={pdfTheme.p}>SIRET : {d.siret ?? "—"}</Text>
        {(d.adresse || d.codePostal || d.ville) && (
          <Text style={pdfTheme.p}>{[d.adresse, d.codePostal, d.ville].filter(Boolean).join(" ")}</Text>
        )}
      </View>
      <View style={pdfTheme.section}>
        <Text style={pdfTheme.h3}>Article 3 - Période</Text>
        <Text style={pdfTheme.p}>
          Du {d.dateEffet ?? "—"} au {d.dateEcheance ?? "—"}
        </Text>
      </View>
      <View style={pdfTheme.section}>
        <Text style={pdfTheme.h3}>Article 2 - Activités garanties</Text>
        <Text style={pdfTheme.p}>{activities.length ? activities.join("\n") : "—"}</Text>
      </View>
      <View style={pdfTheme.section}>
        <Text style={pdfTheme.h3}>Article 4 - Conditions</Text>
        <View style={pdfTheme.tableCard}>
          <View style={pdfTheme.tableHeader}>
            <Text style={pdfTheme.tableHeaderText}>Synthèse financière</Text>
          </View>
          <View style={pdfTheme.row}>
            <Text style={pdfTheme.cellLeft}>Prime annuelle</Text>
            <Text style={pdfTheme.cellRight}>{(d.primeAnnuelle ?? 0).toLocaleString("fr-FR")} € TTC</Text>
          </View>
          <View style={pdfTheme.row}>
            <Text style={pdfTheme.cellLeft}>Franchise</Text>
            <Text style={pdfTheme.cellRight}>{(d.franchise ?? 0).toLocaleString("fr-FR")} €</Text>
          </View>
          <View style={pdfTheme.rowLast}>
            <Text style={pdfTheme.cellLeft}>Plafond</Text>
            <Text style={pdfTheme.cellRight}>{(d.plafond ?? 0).toLocaleString("fr-FR")} €</Text>
          </View>
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
  const activities = extractStructuredActivities(d)
  const optimizedExclusions = extractOptimizedExclusionLines(d)
  const activityLines = activities.length > 0 ? activities : ["Activité déclarée au contrat"]
  return (
    <Page size="A4" style={pdfTheme.page}>
      <PdfBrandHeader tagline="Assurance décennale professionnelle" />
      <Text style={pdfTheme.h2Center}>ATTESTATION D&apos;ASSURANCE</Text>
      <Text style={[pdfTheme.subtitleCenter, { color: "#2563eb", fontFamily: "Helvetica-Bold" }]}>N° {numero}</Text>
      <View style={pdfTheme.attestCard}>
        <Text style={pdfTheme.p}>La société Optimum Assurance atteste que :</Text>
        <Text style={[pdfTheme.p, { fontFamily: "Helvetica-Bold", color: "#0f172a" }]}>{d.raisonSociale ?? "—"}</Text>
        <Text style={pdfTheme.p}>SIRET : {d.siret ?? "—"}</Text>
        {(d.adresse || d.codePostal || d.ville) && (
          <Text style={pdfTheme.p}>{[d.adresse, d.codePostal, d.ville].filter(Boolean).join(" ")}</Text>
        )}
        <Text style={pdfTheme.p}>
          est garantie au titre de l&apos;assurance responsabilité civile décennale pour les activités :
        </Text>
        {activityLines.map((line, index) => (
          <Text key={`attestation-activity-${index}`} style={pdfTheme.p}>
            • {line}
          </Text>
        ))}
        {optimizedExclusions.length > 0 && (
          <Text style={pdfTheme.p}>
            Ne sont pas couverts : {optimizedExclusions.join(" ; ")}
          </Text>
        )}
        <Text style={pdfTheme.p}>
          Période : du {d.dateEffet ?? "—"} au {d.dateEcheance ?? "—"}
        </Text>
        <Text style={pdfTheme.p}>Prime annuelle : {(d.primeAnnuelle ?? 0).toLocaleString("fr-FR")} € TTC</Text>
        {d.verificationQrDataUri && (
          <View style={{ flexDirection: "row", marginTop: 14, alignItems: "flex-start" }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/Image sans alt ; QR décoratif, URL en texte */}
            <Image src={d.verificationQrDataUri} style={{ width: 72, height: 72, marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 8, marginBottom: 4, fontFamily: "Helvetica-Bold", color: "#1e40af" }}>
                Vérification en ligne
              </Text>
              {d.verificationUrl ? (
                <Text style={{ fontSize: 7, lineHeight: 1.35, color: "#475569" }}>{d.verificationUrl}</Text>
              ) : null}
            </View>
          </View>
        )}
      </View>
      <View style={{ flexDirection: "row", marginTop: 14 }}>
        <View
          style={{
            width: "46%",
            borderWidth: 1.3,
            borderColor: "#1e40af",
            borderRadius: 8,
            padding: 8,
            marginRight: "8%",
          }}
        >
          <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: "#1e40af", marginBottom: 2 }}>
            TAMPON ASSUREUR
          </Text>
          <Text style={{ fontSize: 8, color: "#0f172a", lineHeight: 1.35 }}>
            OPTIMUM COURTAGE{"\n"}Par délégation{"\n"}ACCELERANT INSURANCE
          </Text>
        </View>
        <View style={{ width: "46%", justifyContent: "flex-end" }}>
          <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: "#0f172a", marginBottom: 8 }}>
            Émission autorisée
          </Text>
          <View style={{ borderTopWidth: 1, borderTopColor: "#64748b", paddingTop: 5 }}>
            <Text style={{ fontSize: 8, color: "#334155" }}>Service émission attestations</Text>
            <Text style={{ fontSize: 8, color: "#334155" }}>Optimum Courtage</Text>
            <Text style={{ fontSize: 8, color: "#334155" }}>Par délégation Accelerant Insurance</Text>
          </View>
        </View>
      </View>
      <Text style={[pdfTheme.legalText, { marginTop: 14 }]}>{pdfLegalLinksLine()}</Text>
      <Text style={[pdfTheme.legalText, { marginTop: 6 }]}>
        Optimum Courtage agit par délégation de Accelerant Insurance.
      </Text>
    </Page>
  )
}

export function AttestationNominativePDFPage({
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
    beneficiaireNom?: string
    chantierAdresse?: string
    objetMission?: string
  }
  return (
    <Page size="A4" style={pdfTheme.page}>
      <PdfBrandHeader tagline="Attestation décennale nominative" />
      <Text style={pdfTheme.h2Center}>ATTESTATION D&apos;ASSURANCE NOMINATIVE</Text>
      <Text style={[pdfTheme.subtitleCenter, { color: "#2563eb", fontFamily: "Helvetica-Bold" }]}>N° {numero}</Text>
      <View style={pdfTheme.attestCard}>
        <Text style={pdfTheme.p}>La société Optimum Assurance atteste que :</Text>
        <Text style={[pdfTheme.p, { fontFamily: "Helvetica-Bold", color: "#0f172a" }]}>{d.raisonSociale ?? "—"}</Text>
        <Text style={pdfTheme.p}>SIRET : {d.siret ?? "—"}</Text>
        {(d.adresse || d.codePostal || d.ville) && (
          <Text style={pdfTheme.p}>{[d.adresse, d.codePostal, d.ville].filter(Boolean).join(" ")}</Text>
        )}
        <Text style={pdfTheme.p}>
          est garantie au titre de l&apos;assurance responsabilité civile décennale pour les activités :{" "}
          {d.activites?.join(", ") ?? "—"}
        </Text>
        <Text style={pdfTheme.p}>
          Période : du {d.dateEffet ?? "—"} au {d.dateEcheance ?? "—"}
        </Text>
        <Text style={pdfTheme.p}>Prime annuelle : {(d.primeAnnuelle ?? 0).toLocaleString("fr-FR")} € TTC</Text>
      </View>

      <View style={pdfTheme.section}>
        <Text style={[pdfTheme.p, { fontFamily: "Helvetica-Bold", color: "#1e40af" }]}>
          Bénéficiaire nominatif
        </Text>
        <Text style={pdfTheme.p}>Bénéficiaire : {d.beneficiaireNom ?? "—"}</Text>
        {d.chantierAdresse ? <Text style={pdfTheme.p}>Adresse du chantier : {d.chantierAdresse}</Text> : null}
        {d.objetMission ? <Text style={pdfTheme.p}>Objet / lot : {d.objetMission}</Text> : null}
      </View>

      {d.verificationQrDataUri && (
        <View style={pdfTheme.section}>
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/Image sans alt ; QR décoratif, URL en texte */}
            <Image src={d.verificationQrDataUri} style={{ width: 72, height: 72, marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 8, marginBottom: 4, fontFamily: "Helvetica-Bold", color: "#1e40af" }}>
                Vérification en ligne
              </Text>
              {d.verificationUrl ? (
                <Text style={{ fontSize: 7, lineHeight: 1.35, color: "#475569" }}>{d.verificationUrl}</Text>
              ) : null}
            </View>
          </View>
        </View>
      )}

      <Text style={[pdfTheme.legalText, { marginTop: 14 }]}>{pdfLegalLinksLine()}</Text>
      <Text style={[pdfTheme.legalText, { marginTop: 6 }]}>
        Optimum Courtage agit par délégation de Accelerant Insurance.
      </Text>
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
    <Page size="A4" style={pdfTheme.page}>
      <PdfBrandHeader tagline="Assurance dommage ouvrage" />
      <Text style={pdfTheme.h2Center}>ATTESTATION D&apos;ASSURANCE</Text>
      <Text style={[pdfTheme.subtitleCenter, { color: "#2563eb", fontFamily: "Helvetica-Bold" }]}>
        Dommage Ouvrage — N° {numero}
      </Text>
      <View style={pdfTheme.attestCard}>
        <Text style={pdfTheme.p}>La société Optimum Assurance atteste que :</Text>
        <Text style={[pdfTheme.p, { fontFamily: "Helvetica-Bold", color: "#0f172a" }]}>{d.raisonSociale ?? "—"}</Text>
        {(d.adresseOperation || d.codePostal || d.ville) && (
          <Text style={pdfTheme.p}>{[d.adresseOperation, d.codePostal, d.ville].filter(Boolean).join(", ")}</Text>
        )}
        <Text style={pdfTheme.p}>Type de garantie : {typeGarantie}</Text>
        <Text style={pdfTheme.p}>
          Validité : du {d.dateSignature ?? "—"} au {d.dateEcheance ?? "—"} (10 ans, non résiliable)
        </Text>
        <Text style={pdfTheme.p}>Prime : {(d.primeAnnuelle ?? 0).toLocaleString("fr-FR")} € TTC</Text>
        {d.verificationQrDataUri && (
          <View style={{ flexDirection: "row", marginTop: 14, alignItems: "flex-start" }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/Image sans alt ; QR décoratif, URL en texte */}
            <Image src={d.verificationQrDataUri} style={{ width: 72, height: 72, marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 8, marginBottom: 4, fontFamily: "Helvetica-Bold", color: "#1e40af" }}>
                Vérification en ligne
              </Text>
              {d.verificationUrl ? (
                <Text style={{ fontSize: 7, lineHeight: 1.35, color: "#475569" }}>{d.verificationUrl}</Text>
              ) : null}
            </View>
          </View>
        )}
      </View>
      <Text style={[pdfTheme.legalText, { marginTop: 14 }]}>{pdfLegalLinksLine()}</Text>
      <Text style={[pdfTheme.legalText, { marginTop: 6 }]}>
        Optimum Courtage agit par délégation de Accelerant Insurance.
      </Text>
    </Page>
  )
}

/** Facture acquittée — assurance décennale (1er trimestre CB + frais). Ne pas confondre avec facture DO. */
export function FactureDecennalePDFPage({
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
    email?: string
    primeAnnuelle?: number
    fraisGestion?: number
    montantPremierTrimestre?: number
    montantTotalPaye?: number
    datePaiement?: string
  }
  return (
    <Page size="A4" style={pdfTheme.page}>
      <PdfBrandHeader tagline="Assurance décennale — facturation" />
      <Text style={pdfTheme.h2Center}>FACTURE ACQUITTÉE</Text>
      <Text style={pdfTheme.subtitleCenter}>
        N° {numero} — {d.datePaiement ?? ""}
      </Text>
      <View style={pdfTheme.section}>
        <Text style={[pdfTheme.p, { fontFamily: "Helvetica-Bold" }]}>Client : {d.raisonSociale ?? "—"}</Text>
        {d.siret ? <Text style={pdfTheme.p}>SIRET : {d.siret}</Text> : null}
        {d.email ? <Text style={pdfTheme.p}>{d.email}</Text> : null}
        {(d.adresse || d.codePostal || d.ville) && (
          <Text style={pdfTheme.p}>{[d.adresse, d.codePostal, d.ville].filter(Boolean).join(", ")}</Text>
        )}
      </View>
      <View style={pdfTheme.tableCard}>
        <View style={pdfTheme.tableHeader}>
          <Text style={pdfTheme.tableHeaderText}>Désignation</Text>
        </View>
        <View style={pdfTheme.row}>
          <Text style={pdfTheme.cellLeft}>
            Assurance décennale — 1er trimestre (règlement par carte bancaire), prélèvements trimestriels suivants sur
            mandat SEPA
          </Text>
          <Text style={pdfTheme.cellRight}>{(d.montantPremierTrimestre ?? 0).toLocaleString("fr-FR")} €</Text>
        </View>
        <View style={pdfTheme.row}>
          <Text style={pdfTheme.cellLeft}>Frais de gestion prélèvement (trimestriel)</Text>
          <Text style={pdfTheme.cellRight}>{(d.fraisGestion ?? 0).toLocaleString("fr-FR")} €</Text>
        </View>
        <View style={pdfTheme.rowLast}>
          <Text style={pdfTheme.cellLeft}>Total TTC réglé</Text>
          <Text style={pdfTheme.cellRight}>
            {(d.montantTotalPaye ?? 0).toLocaleString("fr-FR")} €
          </Text>
        </View>
      </View>
      <Text style={[pdfTheme.p, { marginTop: 10, fontSize: 8, color: "#64748b" }]}>
        Prime annuelle de référence : {(d.primeAnnuelle ?? 0).toLocaleString("fr-FR")} € (échéances suivantes selon
        mandat).
      </Text>
      <Text style={[pdfTheme.legalText, { marginTop: 16 }]}>{pdfLegalLinksLine()}</Text>
      <Text style={[pdfTheme.legalText, { marginTop: 6 }]}>
        Optimum Courtage agit par délégation de Accelerant Insurance.
      </Text>
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
    <Page size="A4" style={pdfTheme.page}>
      <PdfBrandHeader tagline="Assurance dommage ouvrage — facturation" />
      <Text style={pdfTheme.h2Center}>FACTURE ACQUITTÉE</Text>
      <Text style={pdfTheme.subtitleCenter}>
        N° {numero} — {d.datePaiement ?? ""}
      </Text>
      <View style={pdfTheme.section}>
        <Text style={[pdfTheme.p, { fontFamily: "Helvetica-Bold" }]}>Client : {d.raisonSociale ?? "—"}</Text>
        {(d.adresse || d.codePostal || d.ville) && (
          <Text style={pdfTheme.p}>{[d.adresse, d.codePostal, d.ville].filter(Boolean).join(", ")}</Text>
        )}
      </View>
      <View style={pdfTheme.tableCard}>
        <View style={pdfTheme.tableHeader}>
          <Text style={pdfTheme.tableHeaderText}>Détail</Text>
        </View>
        <View style={pdfTheme.row}>
          <Text style={pdfTheme.cellLeft}>Assurance DO — {typeGarantie}</Text>
          <Text style={pdfTheme.cellRight}>{(d.primeAnnuelle ?? 0).toLocaleString("fr-FR")} €</Text>
        </View>
        <View style={pdfTheme.rowLast}>
          <Text style={pdfTheme.cellLeft}>Total TTC</Text>
          <Text style={pdfTheme.cellRight}>{(d.totalTTC ?? d.primeAnnuelle ?? 0).toLocaleString("fr-FR")} €</Text>
        </View>
      </View>
      <Text style={[pdfTheme.legalText, { marginTop: 16 }]}>{pdfLegalLinksLine()}</Text>
      <Text style={[pdfTheme.legalText, { marginTop: 6 }]}>
        Optimum Courtage agit par délégation de Accelerant Insurance.
      </Text>
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
    <Page size="A4" style={pdfTheme.page}>
      <PdfBrandHeader tagline="Assurance décennale professionnelle" />
      <Text style={pdfTheme.h2Center}>ATTESTATION DE NON SINISTRALITÉ</Text>
      <Text style={pdfTheme.subtitleCenter}>N° {numero}</Text>
      <View style={pdfTheme.attestCard}>
        <Text style={pdfTheme.p}>
          La société Optimum Assurance atteste que {d.raisonSociale ?? "—"} (SIRET : {d.siret ?? "—"}) n&apos;a déclaré
          aucun sinistre sur la période du {formatDate(d.dateDebut ?? "")} au {formatDate(d.dateFin ?? "")}.
        </Text>
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
  const label = labels[type] || type
  return (
    <Page size="A4" style={pdfTheme.page}>
      <PdfBrandHeader tagline={label} />
      <Text style={pdfTheme.h2}>{label}</Text>
      <Text style={[pdfTheme.p, { fontFamily: "Helvetica-Bold", color: "#1e40af" }]}>N° {numero}</Text>
      {d.raisonSociale && <Text style={pdfTheme.p}>Client : {d.raisonSociale}</Text>}
      {d.primeAnnuelle != null && (
        <Text style={pdfTheme.p}>Prime : {d.primeAnnuelle.toLocaleString("fr-FR")} € TTC</Text>
      )}
      {d.dateEffet && <Text style={pdfTheme.p}>Date d&apos;effet : {d.dateEffet}</Text>}
      <Text style={[pdfTheme.p, { marginTop: 20, fontSize: 9, color: "#64748b" }]}>
        Consultez ce document en ligne dans votre espace client pour les détails complets.
      </Text>
      <Text style={[pdfTheme.legalText, { marginTop: 14 }]}>{pdfLegalLinksLine()}</Text>
      <Text style={[pdfTheme.legalText, { marginTop: 6 }]}>
        Optimum Courtage agit par délégation de Accelerant Insurance.
      </Text>
    </Page>
  )
}
