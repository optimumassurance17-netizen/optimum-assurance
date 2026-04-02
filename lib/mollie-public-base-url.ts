/**
 * Base URL pour `redirectUrl` et `webhookUrl` Mollie (doit être HTTPS et joignable depuis Internet).
 *
 * Priorité : `MOLLIE_PUBLIC_BASE_URL` (ex. URL ngrok en test local) puis `NEXT_PUBLIC_APP_URL`.
 * Sans slash final. Si les deux sont vides, fallback `http://localhost:3000` (Mollie refusera souvent le webhook — utiliser ngrok).
 *
 * @see https://docs.mollie.com/reference/webhooks
 */
export function getMolliePublicBaseUrl(): string {
  const raw =
    process.env.MOLLIE_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    ""
  const cleaned = raw.replace(/\/+$/, "")
  if (cleaned) return cleaned
  return "http://localhost:3000"
}
