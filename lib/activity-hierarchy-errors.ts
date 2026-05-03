export function isActivityHierarchySchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const payload = error as { code?: unknown; message?: unknown }
  const code = typeof payload.code === "string" ? payload.code : ""
  const message = typeof payload.message === "string" ? payload.message : ""
  const isHierarchyTableMessage =
    /(ActivityGroup|SubActivity|MissingSubActivity|public\.`?ActivityGroup`?|public\.`?SubActivity`?|public\.`?MissingSubActivity`?)/i.test(message) &&
    /(does not exist|not exist|missing|introuvable|relation .* does not exist)/i.test(message)
  if (isHierarchyTableMessage) return true
  if (code === "P2021" || code === "P2022") {
    return (
      /ActivityGroup/i.test(message) ||
      /SubActivity/i.test(message) ||
      /MissingSubActivity/i.test(message) ||
      /activity/i.test(message)
    )
  }
  return false
}
