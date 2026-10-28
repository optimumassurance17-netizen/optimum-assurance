const INTRO = "Vous signez directement auprès d’Optimum Assurance."

function isInternalPath(nextPath: string | undefined, base: string): boolean {
  if (!nextPath) return false
  return nextPath === base || nextPath.startsWith(`${base}/`) || nextPath.startsWith(`${base}?`)
}

/** Bandeau de la page de signature : la suite annoncée suit le parcours réel. */
export function signaturePageNotice(nextPath: string | undefined): string {
  if (isInternalPath(nextPath, "/mandat-sepa")) {
    return `${INTRO} Après validation, le parcours continue vers le mandat SEPA.`
  }
  if (isInternalPath(nextPath, "/espace-client")) {
    return `${INTRO} Après validation, vous retrouvez votre espace client.`
  }
  if (nextPath) {
    return `${INTRO} Après validation, le parcours continue.`
  }
  return `${INTRO} Après validation, vous pourrez télécharger le document signé.`
}
