import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import { ContratPDF } from "@/components/pdf/ContratPDF"
import { FRANCHISE_DECENNALE_EUR } from "@/lib/tarification"
import { stripSignatureBinaries } from "@/lib/esign/local-signature-fallback"

function asActivities(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

/** Reconstruit le contrat décennale à partir du dossier en attente, sans relire Supabase. */
export async function renderPendingDecennalePdf(
  raw: Record<string, unknown>,
  numero: string
): Promise<Uint8Array> {
  const stored = stripSignatureBinaries(raw)
  const activites = asActivities(stored.activites)
  const primeAnnuelle = asNumber(stored.primeAnnuelle)
  const data = {
    ...stored,
    raisonSociale: typeof stored.raisonSociale === "string" ? stored.raisonSociale : "",
    siret: typeof stored.siret === "string" ? stored.siret : "",
    activites,
    chiffreAffaires: asNumber(stored.chiffreAffaires),
    primeAnnuelle,
    primeMensuelle: asNumber(stored.primeMensuelle, primeAnnuelle > 0 ? Math.round((primeAnnuelle / 12) * 100) / 100 : 0),
    primeTrimestrielle: asNumber(
      stored.primeTrimestrielle,
      primeAnnuelle > 0 ? Math.round((primeAnnuelle / 4) * 100) / 100 : 0
    ),
    franchise: asNumber(stored.franchise, FRANCHISE_DECENNALE_EUR) || FRANCHISE_DECENNALE_EUR,
    plafond: asNumber(stored.plafond, 100_000) || 100_000,
    dateEffet: typeof stored.dateEffet === "string" ? stored.dateEffet : "",
    dateEcheance: typeof stored.dateEcheance === "string" ? stored.dateEcheance : "",
  }
  const pdfElement = React.createElement(ContratPDF, { numero, data })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- renderToBuffer attend un Document react-pdf
  const buffer = await renderToBuffer(pdfElement as any)
  return new Uint8Array(buffer)
}
