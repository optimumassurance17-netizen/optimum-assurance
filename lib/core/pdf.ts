import { DEVOIR_CONSEIL_TEXT_BY_PRODUCT, getDevoirConseilLinksLine } from "@/lib/devoir-conseil"

export type CoreLegalMentions = {
  legalNotes: string
  legalLinks: string
}

export function getCoreRcProLegalMentions(): CoreLegalMentions {
  return {
    legalNotes: DEVOIR_CONSEIL_TEXT_BY_PRODUCT.rc_fabriquant.contenu,
    legalLinks: getDevoirConseilLinksLine("rc_fabriquant"),
  }
}
