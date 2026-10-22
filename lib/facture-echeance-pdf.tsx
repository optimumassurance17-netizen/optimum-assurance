import React from "react"
import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer"
import { pdfLegalLinksLine } from "@/lib/pdf-legal-links"
import { PdfBrandHeader, pdfTheme } from "@/lib/pdf/react-pdf-brand"

export type FactureEcheancePdfData = {
  numero: string
  raisonSociale: string
  email?: string | null
  siret?: string | null
  adresse?: string | null
  codePostal?: string | null
  ville?: string | null
  label: string
  amount: number
  echeanceLe: string
}

function FactureEcheancePDFPage({ data }: { data: FactureEcheancePdfData }) {
  const address = [data.adresse, data.codePostal, data.ville].filter(Boolean).join(", ")
  return (
    <Page size="A4" style={pdfTheme.page}>
      <PdfBrandHeader tagline="Assurance décennale — facturation" />
      <Text style={pdfTheme.h2Center}>FACTURE</Text>
      <Text style={pdfTheme.subtitleCenter}>
        N° {data.numero} — échéance du {data.echeanceLe}
      </Text>
      <View style={pdfTheme.section}>
        <Text style={[pdfTheme.p, { fontFamily: "Helvetica-Bold" }]}>Client : {data.raisonSociale}</Text>
        {data.siret ? <Text style={pdfTheme.p}>SIRET : {data.siret}</Text> : null}
        {data.email ? <Text style={pdfTheme.p}>{data.email}</Text> : null}
        {address ? <Text style={pdfTheme.p}>{address}</Text> : null}
      </View>
      <View style={pdfTheme.tableCard}>
        <View style={pdfTheme.tableHeader}>
          <Text style={pdfTheme.tableHeaderText}>Désignation</Text>
        </View>
        <View style={pdfTheme.row}>
          <Text style={pdfTheme.cellLeft}>Assurance décennale — {data.label}</Text>
          <Text style={pdfTheme.cellRight}>{data.amount.toLocaleString("fr-FR")} €</Text>
        </View>
        <View style={pdfTheme.rowLast}>
          <Text style={pdfTheme.cellLeft}>Total TTC à régler</Text>
          <Text style={pdfTheme.cellRight}>{data.amount.toLocaleString("fr-FR")} €</Text>
        </View>
      </View>
      <Text style={[pdfTheme.p, { marginTop: 12 }]}>
        Cette facture accompagne l’échéance du {data.echeanceLe}. Ce n’est pas une facture acquittée : le règlement
        intervient à cette date, par prélèvement si le mandat SEPA est actif.
      </Text>
      <Text style={[pdfTheme.legalText, { marginTop: 16 }]}>{pdfLegalLinksLine()}</Text>
      <Text style={[pdfTheme.legalText, { marginTop: 6 }]}>
        Optimum Courtage agit par délégation de Accelerant Insurance.
      </Text>
    </Page>
  )
}

export async function renderFactureEcheancePdf(data: FactureEcheancePdfData): Promise<Buffer> {
  const element = React.createElement(Document, {}, React.createElement(FactureEcheancePDFPage, { data }))
  const bytes = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0])
  return Buffer.from(bytes)
}
