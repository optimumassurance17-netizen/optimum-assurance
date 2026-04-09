export type JsonObject = Record<string, unknown>

/**
 * Normalise une valeur JSON inconnue vers un objet indexable.
 * Retourne un objet vide pour les tableaux, null et primitives.
 */
export function asJsonObject<T extends JsonObject = JsonObject>(value: unknown): Partial<T> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Partial<T>
  }
  return {}
}
