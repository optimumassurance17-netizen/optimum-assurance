/**
 * En-tête et styles communs pour les PDF @react-pdf/renderer (contrats, attestations, résumés).
 */
import React from "react"
import { Text, View, StyleSheet } from "@react-pdf/renderer"
import { LEGAL_ORIAS_LINE } from "@/lib/legal-branding"

export const pdfTheme = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    color: "#171717",
    fontFamily: "Helvetica",
  },
  /** Titre document principal (sous l’en-tête marque) */
  h2: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginBottom: 10,
    marginTop: 4,
    color: "#0a0a0a",
    letterSpacing: 0.3,
  },
  /** Titres centrés (attestations, factures) */
  h2Center: {
    fontSize: 15,
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    marginTop: 4,
    color: "#0f172a",
  },
  subtitleCenter: {
    textAlign: "center",
    marginBottom: 18,
    fontSize: 10,
    color: "#64748b",
  },
  h3: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    marginTop: 12,
    color: "#0f172a",
  },
  p: { marginBottom: 6, lineHeight: 1.45 },
  section: { marginBottom: 12 },
  /** Bloc conditions financières */
  tableCard: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "#f8fafc",
  },
  tableHeader: {
    backgroundColor: "#eff6ff",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#bfdbfe",
  },
  tableHeaderText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#1e40af",
  },
  row: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  rowLast: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 0,
  },
  cellLeft: { flex: 1, fontSize: 9, color: "#334155" },
  cellRight: { width: 110, textAlign: "right", fontSize: 9, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  signatureZone: {
    marginTop: 36,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
  },
  legalBlock: {
    marginTop: 22,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  legalText: { fontSize: 8, color: "#475569", lineHeight: 1.4 },
  /** Carte attestations / encadré principal */
  attestCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderLeftWidth: 4,
    borderLeftColor: "#2563eb",
    padding: 18,
    backgroundColor: "#fafafa",
  },
})

const brandStyles = StyleSheet.create({
  header: { marginBottom: 18 },
  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  monogram: {
    width: 44,
    height: 44,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
  },
  monogramLetter: {
    color: "#ffffff",
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
  },
  brandCol: { marginLeft: 12, flex: 1 },
  brandName: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: "#2563eb",
    marginBottom: 3,
  },
  brandMeta: { fontSize: 7.5, color: "#64748b", lineHeight: 1.35 },
  accentBar: { height: 2.5, backgroundColor: "#2563eb", width: "100%", marginBottom: 8 },
  tagline: { fontSize: 9, color: "#64748b" },
})

export function PdfBrandHeader({ tagline }: { tagline: string }) {
  return (
    <View style={brandStyles.header}>
      <View style={brandStyles.brandRow}>
        <View style={brandStyles.monogram}>
          <Text style={brandStyles.monogramLetter}>O</Text>
        </View>
        <View style={brandStyles.brandCol}>
          <Text style={brandStyles.brandName}>Optimum Assurance</Text>
          <Text style={brandStyles.brandMeta}>{LEGAL_ORIAS_LINE}</Text>
        </View>
      </View>
      <View style={brandStyles.accentBar} />
      <Text style={brandStyles.tagline}>{tagline}</Text>
    </View>
  )
}
