import React from "react"
import { Document } from "@react-pdf/renderer"
import {
  ContratPDFPage,
  AttestationPDFPage,
  AttestationNominativePDFPage,
  AttestationDoPDFPage,
  FactureDoPDFPage,
  FactureDecennalePDFPage,
  AttestationNonSinistralitePDFPage,
  DocumentResumePDFPage,
} from "@/lib/pdf-pages"

interface DocItem {
  id: string
  type: string
  numero: string
  data: Record<string, unknown>
}

const pageMap: Record<
  string,
  (props: { numero: string; data: Record<string, unknown> }) => React.ReactElement
> = {
  contrat: (p) => React.createElement(ContratPDFPage, p),
  attestation: (p) => React.createElement(AttestationPDFPage, p),
  attestation_nominative: (p) => React.createElement(AttestationNominativePDFPage, p),
  attestation_do: (p) => React.createElement(AttestationDoPDFPage, p),
  facture_do: (p) => React.createElement(FactureDoPDFPage, p),
  facture_decennale: (p) => React.createElement(FactureDecennalePDFPage, p),
  attestation_non_sinistralite: (p) => React.createElement(AttestationNonSinistralitePDFPage, p),
}

export function DocumentsCombinedPDF({ documents }: { documents: DocItem[] }) {
  const pages = documents.map((doc) => {
    const renderer = pageMap[doc.type]
    if (renderer) {
      return renderer({ numero: doc.numero, data: doc.data })
    }
    return React.createElement(DocumentResumePDFPage, {
      type: doc.type,
      numero: doc.numero,
      data: doc.data,
    })
  })

  return React.createElement(Document, {}, ...pages)
}
