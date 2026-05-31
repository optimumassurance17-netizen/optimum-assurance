function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function readErrorCode(error: unknown): string {
  if (!error || typeof error !== "object") return ""
  const payload = error as { code?: unknown; errorCode?: unknown }
  if (typeof payload.code === "string") return payload.code
  if (typeof payload.errorCode === "string") return payload.errorCode
  return ""
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (!error || typeof error !== "object") return ""
  const payload = error as { message?: unknown }
  return typeof payload.message === "string" ? payload.message : ""
}

function matchesIdentifiers(message: string, identifiers: string[]): boolean {
  if (identifiers.length === 0) return true
  return identifiers.some((identifier) => new RegExp(escapeRegExp(identifier), "i").test(message))
}

export function isPrismaSchemaDriftError(
  error: unknown,
  identifiers: string[] = []
): boolean {
  const code = readErrorCode(error)
  const message = readErrorMessage(error)
  const hasSchemaCode = code === "P2021" || code === "P2022"
  const hasSchemaMessage =
    /(does not exist|not exist|missing|introuvable|unknown column|relation .* does not exist|column .* does not exist|table .* does not exist)/i.test(
      message
    )

  if (!hasSchemaCode && !hasSchemaMessage) return false
  return matchesIdentifiers(message, identifiers)
}

export async function withSchemaDriftFallback<T>(
  loader: () => Promise<T>,
  fallback: T,
  options?: {
    identifiers?: string[]
    warning?: string
    onWarning?: (warning: string) => void
  }
): Promise<T> {
  try {
    return await loader()
  } catch (error) {
    if (!isPrismaSchemaDriftError(error, options?.identifiers ?? [])) {
      throw error
    }
    if (options?.warning && options.onWarning) {
      options.onWarning(options.warning)
    }
    return fallback
  }
}
