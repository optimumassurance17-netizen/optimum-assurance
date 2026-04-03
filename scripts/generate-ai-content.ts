/**
 * Génération de contenus SEO via OpenAI + injection Supabase (contenus_seo).
 *
 * Variables :
 *   OPENAI_API_KEY (obligatoire)
 *   OPENAI_MODEL (optionnel, défaut gpt-4o)
 *   NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (obligatoire pour insert)
 *   AI_LIMIT_PER_RUN — nombre max de pages générées ce run (défaut 5)
 *   AI_DELAY_MS — pause entre appels API (défaut 1200)
 *
 * Usage :
 *   npm run seo:ai -- --dry-run --limit 1 --metier macon --ville paris
 *   npm run seo:ai -- --mode decennale --limit 10
 *   npm run seo:ai -- --mode do --limit 5
 */

import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

import { estimateCostUsd, type SEOGenerationResult } from "@/lib/openai"
import { generateDOContent, generatePageContent } from "@/lib/seo-ai/generate"
import { buildStoredContenu } from "@/lib/seo-ai/persist"
import type { AiPagePayload, MetierContext, TypeProjetContext, VilleContext } from "@/lib/seo-ai/types"
import { createSupabaseServiceClient } from "@/lib/supabase"
import { METIERS_SEED, TYPES_PROJETS_SEED, VILLES_FR } from "@/lib/seo-bulk-generate/seed-data"
import { buildAiSlug } from "@/utils/slugify"

type Mode = "decennale" | "do" | "all"

function parseArgs() {
  const argv = process.argv.slice(2)
  const get = (name: string) => {
    const a = argv.find((x) => x.startsWith(`${name}=`))
    return a?.split("=").slice(1).join("=")
  }
  return {
    dryRun: argv.includes("--dry-run"),
    limit: Math.max(1, parseInt(get("--limit") || process.env.AI_LIMIT_PER_RUN || "5", 10)),
    delayMs: Math.max(0, parseInt(process.env.AI_DELAY_MS || "1200", 10)),
    mode: (get("--mode") as Mode) || "all",
    metierSlug: get("--metier"),
    villeSlug: get("--ville"),
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchExistingSlugs(supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>) {
  const { data, error } = await supabase.from("contenus_seo").select("slug").like("slug", "ai:%")
  if (error) {
    console.warn("Impossible de lire les slugs existants :", error.message)
    return new Set<string>()
  }
  return new Set((data ?? []).map((r: { slug: string | null }) => r.slug).filter(Boolean) as string[])
}

async function main() {
  const { dryRun, limit, delayMs, mode, metierSlug, villeSlug } = parseArgs()

  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.error("❌ Définissez OPENAI_API_KEY.")
    process.exit(1)
  }

  const supabase = dryRun ? null : createSupabaseServiceClient()
  if (!dryRun && !supabase) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL requis pour l’insertion.")
    process.exit(1)
  }

  const existing =
    supabase && !metierSlug ? await fetchExistingSlugs(supabase) : new Set<string>()

  let generated = 0
  let skipped = 0
  let totalTokens = 0
  let totalCost = 0
  const modelUsed = new Set<string>()

  /** Exemple ciblé : maçon + paris */
  if (metierSlug && villeSlug) {
    const m = METIERS_SEED.find((x) => x.slug === metierSlug)
    const v = VILLES_FR.find((x) => x.slug === villeSlug)
    if (!m || !v) {
      console.error("Métier ou ville introuvable dans le seed.")
      process.exit(1)
    }
    const metier: MetierContext = {
      nom: m.nom,
      slug: m.slug,
      description_courte: m.description,
      risques_typiques: m.risques,
    }
    const ville: VilleContext = { nom: v.nom, slug: v.slug, population: v.population }
    console.log(`→ Génération ciblée : ${m.nom} × ${v.nom} (dry-run=${dryRun})\n`)
    const { payload, usageCost } = await generatePageContent(metier, ville, { variationIndex: 0 })
    if (usageCost.usage) {
      totalTokens += usageCost.usage.total_tokens
      totalCost += estimateCostUsd(usageCost.model, usageCost.usage)
      modelUsed.add(usageCost.model)
    }
    printFullExample(metier.slug, ville.slug, payload)
    if (!dryRun && supabase) {
      const slugAi = buildAiSlug("decennale", m.slug, v.slug)
      await upsertOne(supabase, {
        slug: slugAi,
        type_page: "decennale_ai",
        title: payload.title,
        meta_description: payload.meta_description,
        h1: payload.h1,
        contenu: buildStoredContenu(payload),
      })
      console.log("\n✅ Inséré dans contenus_seo :", slugAi)
    }
    logTotals(1, totalTokens, totalCost, modelUsed)
    process.exit(0)
  }

  const tasks: {
    slug: string
    type_page: string
    run: () => Promise<{ payload: AiPagePayload; usageCost: SEOGenerationResult }>
  }[] = []

  if (mode === "decennale" || mode === "all") {
    for (const m of METIERS_SEED) {
      for (const v of VILLES_FR) {
        const slug = buildAiSlug("decennale", m.slug, v.slug)
        if (existing.has(slug)) {
          skipped++
          continue
        }
        const metier: MetierContext = {
          nom: m.nom,
          slug: m.slug,
          description_courte: m.description,
          risques_typiques: m.risques,
        }
        const ville: VilleContext = { nom: v.nom, slug: v.slug, population: v.population }
        const variationIndex = (m.slug.length + v.slug.length) % 4
        tasks.push({
          slug,
          type_page: "decennale_ai",
          run: () => generatePageContent(metier, ville, { variationIndex }),
        })
      }
    }
  }

  if (mode === "do" || mode === "all") {
    for (const t of TYPES_PROJETS_SEED) {
      for (const v of VILLES_FR) {
        const slug = buildAiSlug("do", t.slug, v.slug)
        if (existing.has(slug)) {
          skipped++
          continue
        }
        const tp: TypeProjetContext = {
          nom: t.nom,
          slug: t.slug,
          description_courte: t.description,
        }
        const ville: VilleContext = { nom: v.nom, slug: v.slug, population: v.population }
        const variationIndex = (t.slug.length + v.slug.length) % 4
        tasks.push({
          slug,
          type_page: "do_ai",
          run: () => generateDOContent(tp, ville, { variationIndex }),
        })
      }
    }
  }

  console.log(
    `→ Tâches préparées : ${tasks.length} (déjà en base ignorées : ${skipped}). Limite ce run : ${limit}. dry-run=${dryRun}`
  )

  for (const task of tasks) {
    if (generated >= limit) break
    console.log(`\n… Génération ${generated + 1}/${limit} — ${task.slug}`)
    const { payload, usageCost } = await task.run()
    if (usageCost.usage) {
      totalTokens += usageCost.usage.total_tokens
      totalCost += estimateCostUsd(usageCost.model, usageCost.usage)
      modelUsed.add(usageCost.model)
      console.log(
        `   tokens ${usageCost.usage.total_tokens} · ~$${estimateCostUsd(usageCost.model, usageCost.usage)} · ${usageCost.model}`
      )
    }
    if (!dryRun && supabase) {
      await upsertOne(supabase, {
        slug: task.slug,
        type_page: task.type_page,
        title: payload.title,
        meta_description: payload.meta_description,
        h1: payload.h1,
        contenu: buildStoredContenu(payload),
      })
      console.log("   ✓ Supabase OK")
    }
    generated++
    if (generated < limit && delayMs > 0) await sleep(delayMs)
  }

  logTotals(generated, totalTokens, totalCost, modelUsed)
  if (dryRun) console.log("\n(dry-run : aucune écriture Supabase)")
}

async function upsertOne(
  supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>,
  row: {
    slug: string
    type_page: string
    title: string
    meta_description: string
    h1: string
    contenu: string
  }
) {
  const { error } = await supabase.from("contenus_seo").upsert(row, { onConflict: "slug" })
  if (error) throw error
}

function printFullExample(metierSlug: string, villeSlug: string, payload: AiPagePayload) {
  console.log("=== EXEMPLE COMPLET (input : " + metierSlug + " + " + villeSlug + ") ===\n")
  console.log("TITLE:\n", payload.title, "\n")
  console.log("META:\n", payload.meta_description, "\n")
  console.log("H1:\n", payload.h1, "\n")
  console.log("CONTENU (extrait 3500 car. max) :\n")
  console.log(payload.content_markdown.slice(0, 3500), payload.content_markdown.length > 3500 ? "\n… [tronqué affichage]" : "")
  console.log("\nFAQ (aperçu) :", payload.faq.length, "entrées")
  console.log("Mots-clés secondaires :", payload.secondary_keywords.join(", "))
}

function logTotals(
  n: number,
  totalTokens: number,
  totalCost: number,
  models: Set<string>
) {
  console.log("\n--- Synthèse ---")
  console.log(`Pages traitées ce run : ${n}`)
  console.log(`Tokens cumulés (approx.) : ${totalTokens}`)
  console.log(`Coût estimé (USD, indicatif) : ~$${Math.round(totalCost * 1000) / 1000}`)
  console.log(`Modèles : ${[...models].join(", ") || "—"}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
