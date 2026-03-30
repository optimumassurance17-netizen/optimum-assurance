import { SITE_URL } from "@/lib/site-url"

/** Texte court pour pieds de page PDF (décennale & DO). */
export function pdfLegalLinksLine(): string {
  return `CGV : ${SITE_URL}/cgv — Conditions d’émission des attestations : ${SITE_URL}/conditions-attestations`
}
