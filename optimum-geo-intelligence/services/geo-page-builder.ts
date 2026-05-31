import { OGI_CITY_SEEDS, OGI_PROFESSION_SEEDS } from "@/optimum-geo-intelligence/lib/constants"
import { slugify } from "@/optimum-geo-intelligence/lib/utils"
import { generateSeoContent } from "@/optimum-geo-intelligence/services/content-generator"
import { getSupabaseAdminClient } from "@/optimum-geo-intelligence/services/supabase-admin"

async function ensureReferenceData() {
  const sb = getSupabaseAdminClient()
  const { data: cities } = await sb.from("cities").select("name")
  const existingCities = new Set((cities ?? []).map((item) => item.name.toLowerCase()))
  const missingCities = OGI_CITY_SEEDS.filter((city) => !existingCities.has(city.toLowerCase()))
  if (missingCities.length > 0) {
    await sb.from("cities").insert(missingCities.map((name) => ({ name, slug: slugify(name), is_active: true })))
  }

  const { data: professions } = await sb.from("professions").select("name")
  const existingProfessions = new Set((professions ?? []).map((item) => item.name.toLowerCase()))
  const missingProfessions = OGI_PROFESSION_SEEDS.filter(
    (profession) => !existingProfessions.has(profession.toLowerCase())
  )
  if (missingProfessions.length > 0) {
    await sb
      .from("professions")
      .insert(missingProfessions.map((name) => ({ name, slug: slugify(name), is_active: true })))
  }
}

export async function runGeoPageBuilder(options?: { maxCities?: number; maxProfessions?: number; autoPublish?: boolean }) {
  await ensureReferenceData()
  const maxCities = Math.max(1, Math.min(20, options?.maxCities ?? OGI_CITY_SEEDS.length))
  const maxProfessions = Math.max(1, Math.min(20, options?.maxProfessions ?? OGI_PROFESSION_SEEDS.length))
  const autoPublish = options?.autoPublish ?? true

  const selectedCities = [...OGI_CITY_SEEDS].slice(0, maxCities)
  const selectedProfessions = [...OGI_PROFESSION_SEEDS].slice(0, maxProfessions)
  let created = 0

  for (const city of selectedCities) {
    await generateSeoContent({
      type: "local-city",
      keyword: `assurance décennale ${city}`,
      city,
      intent: "local-transactionnel",
      autoPublish,
    })
    created++

    for (const profession of selectedProfessions) {
      await generateSeoContent({
        type: "local-metier-city",
        keyword: `assurance décennale ${profession} ${city}`,
        city,
        profession,
        intent: "local-metier",
        autoPublish,
      })
      created++
    }
  }

  return {
    created,
    cities: selectedCities.length,
    professions: selectedProfessions.length,
  }
}
