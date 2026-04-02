/**
 * Parse le corps d'une Response fetch en JSON.
 * Si le serveur renvoie du HTML (502, page d'erreur, etc.), évite une erreur opaque du type "Unexpected token <".
 */
export async function readResponseJson<T = unknown>(res: Response): Promise<T> {
  const text = await res.text()
  if (!text.trim()) return {} as T
  try {
    return JSON.parse(text) as T
  } catch {
    const msg =
      res.status >= 500
        ? "Service temporairement indisponible. Réessayez dans quelques instants."
        : "Réponse invalide du serveur."
    throw new Error(msg)
  }
}
