import { readFileSync } from "node:fs"
import { generateAdsPack, ADS_LIMITS, fitAdText } from "../lib/ads-robot"
import { decryptSecret, encryptSecret } from "../lib/ads-token-crypto"

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

process.env.OPENAI_API_KEY = ""
process.env.NEXTAUTH_SECRET = "secret-de-verification-ads"

const secret = encryptSecret("refresh-token-exemple")
assert(decryptSecret(secret) === "refresh-token-exemple", "Le jeton chiffré doit se relire.")
assert(!secret.includes("refresh-token-exemple"), "Le jeton ne doit pas rester en clair.")
assert(fitAdText("Assurance décennale pour les artisans du bâtiment", 30).length <= 30, "Le texte doit tenir dans la limite.")

async function main() {
for (const product of ["decennale", "dommage-ouvrage", "les-deux"] as const) {
  const pack = await generateAdsPack({ product, city: "Lyon", angle: "Plombiers" })
  assert(pack.source === "modele", "Sans clé OpenAI, le robot utilise le modèle interne.")
  assert(pack.google.headlines.length >= 3, `${product} : titres Google manquants`)
  assert(pack.google.descriptions.length >= 2, `${product} : descriptions Google manquantes`)
  for (const headline of pack.google.headlines) {
    assert(headline.length <= ADS_LIMITS.googleHeadline, `Titre Google trop long : ${headline}`)
  }
  for (const description of pack.google.descriptions) {
    assert(description.length <= ADS_LIMITS.googleDescription, `Description Google trop longue : ${description}`)
  }
  assert(pack.meta.primaryText.length <= ADS_LIMITS.metaPrimary, "Texte Meta trop long")
  assert(pack.meta.headline.length <= ADS_LIMITS.metaHeadline, "Titre Meta trop long")
  assert(pack.meta.description.length <= ADS_LIMITS.metaDescription, "Description Meta trop longue")
  assert(pack.tiktok.hook.length <= ADS_LIMITS.tiktokHook, "Accroche TikTok trop longue")
  assert(pack.tiktok.caption.length <= ADS_LIMITS.tiktokCaption, "Légende TikTok trop longue")
  assert(pack.tiktok.script.length >= 3, "Script TikTok incomplet")
  const text = JSON.stringify(pack).toLowerCase()
  assert(text.includes("orias") || pack.mentions.some((line) => line.includes("ORIAS")), "Mention courtier absente")
  assert(pack.mentions.some((line) => line.toLowerCase().includes("acceptation")), "Mention d'acceptation absente")
  assert(!text.includes("attestation immédiate"), "Le texte ne doit pas promettre une attestation immédiate")
  assert(!text.includes("sans condition"), "Le texte ne doit pas dire sans condition")
}

const sources = [
  "app/gestion/page.tsx",
  "app/api/gestion/ads/google/connect/route.ts",
  "app/api/gestion/ads/google/callback/route.ts",
  "app/api/gestion/ads/google/campaigns/route.ts",
  "app/api/gestion/ads/generate/route.ts",
  "lib/google-ads.ts",
].map((file) => readFileSync(file, "utf8")).join("\n")

assert(sources.includes('href="/gestion/publicite"'), "La gestion doit ouvrir la page publicité.")
assert(sources.includes("requireGestionAdmin"), "Les routes publicité doivent vérifier l'administrateur.")
assert(sources.includes("listAccessibleCustomers"), "La lecture des comptes Google Ads doit rester disponible.")
assert(!sources.includes("googleAds:mutate"), "Aucune mutation de campagne ne doit être appelée.")
assert(!sources.includes("campaignBudgets"), "Aucun budget ne doit être modifié.")
assert(!sources.includes("mutateOperations"), "Aucune opération de mutation Google Ads.")

console.log("Robot publicitaire OK")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
