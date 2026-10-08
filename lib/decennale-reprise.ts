export type DecennaleRepriseStep = "signature" | "mandat" | "espace" | "devis"

export type DecennaleReprise = {
  step: DecennaleRepriseStep
  href: string
  reason: string
}

export function decideDecennaleReprise(input: {
  pendingSignatureHref: string | null
  hasContract: boolean
  contractDataUsable: boolean
  firstPaymentDone: boolean
  draftResumeHref: string | null
  hasDoJourney: boolean
}): DecennaleReprise {
  if (input.pendingSignatureHref) {
    return { step: "signature", href: input.pendingSignatureHref, reason: "signature_en_attente" }
  }
  if (input.hasContract && input.contractDataUsable && !input.firstPaymentDone) {
    return { step: "mandat", href: "/mandat-sepa", reason: "mandat_a_completer" }
  }
  if (input.firstPaymentDone) {
    return { step: "espace", href: "/espace-client", reason: "deja_paye" }
  }
  if (input.hasContract) {
    return { step: "espace", href: "/espace-client", reason: "contrat_illisible" }
  }
  if (input.draftResumeHref) {
    return { step: "devis", href: input.draftResumeHref, reason: "devis_sauvegarde" }
  }
  if (input.hasDoJourney) {
    return { step: "espace", href: "/espace-client?suite=do", reason: "parcours_do" }
  }
  return { step: "devis", href: "/devis?from=espace-client", reason: "nouveau_devis" }
}

/** Évite de renvoyer une page vers elle-même quand la session navigateur est vide. */
export function safeRepriseHref(
  href: string | null | undefined,
  currentPath: "/signature" | "/mandat-sepa" | "/paiement"
): string {
  const fallback = currentPath === "/signature" ? "/devis?from=espace-client" : "/espace-client"
  if (!href || !href.startsWith("/") || href.startsWith("//")) return fallback
  if (currentPath === "/signature" && (href === "/signature" || href.startsWith("/signature?"))) return fallback
  if (currentPath === "/mandat-sepa" && (href === "/mandat-sepa" || href === "/paiement")) return "/espace-client"
  if (currentPath === "/paiement" && href === "/paiement") return "/espace-client"
  return href
}
