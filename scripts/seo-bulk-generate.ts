/**
 * Injection massive de contenus SEO dans Supabase (Optimum Assurance).
 *
 * Prérequis :
 * - Tables SEO créées (voir sql/supabase-seo-programmatic.sql)
 * - Colonne contenus_seo.slug : sql/supabase-contenus-seo-slug.sql
 * - Variables : NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (recommandé pour inserts)
 *
 * Usage :
 *   npm run seo:bulk
 *   npm run seo:bulk -- --dry-run
 *   npm run seo:bulk -- --batch=80
 *
 * Charge optionnellement .env.local si présent (sans dépendance dotenv).
 */

import { readFileSync, existsSync } from "fs"
import { resolve } from "path"
import { createClient } from "@supabase/supabase-js"
import {
  generateContentDecennaleLocal,
  generateContentDoLocal,
  type GeneratedPage,
} from "@/lib/seo-bulk-generate/generators"
import {
  METIERS_SEED,
  TYPES_PROJETS_SEED,
  VILLES_FR,
} from "@/lib/seo-bulk-generate/seed-data"

loadEnvLocal()

const BATCH_DEFAULT = 60

function loadEnvLocal() {
  const p = resolve(process.cwd(), ".env.local")
  if (!existsSync(p)) return
  const raw = readFileSync(p, "utf8")
  for (const line of raw.split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    let v = t.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (process.env[k] === undefined) process.env[k] = v
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function parseArgs() {
  const argv = process.argv.slice(2)
  return {
    dryRun: argv.includes("--dry-run"),
    batch: Math.max(
      10,
      parseInt(argv.find((a) => a.startsWith("--batch="))?.split("=")[1] ?? "", 10) || BATCH_DEFAULT
    ),
  }
}

function printDryRunExamples() {
  const macon = METIERS_SEED.find((m) => m.slug === "macon")!
  const plombier = METIERS_SEED.find((m) => m.slug === "plombier")!
  const paris = VILLES_FR.find((v) => v.slug === "paris")!
  const lyon = VILLES_FR.find((v) => v.slug === "lyon")!
  const particulier = TYPES_PROJETS_SEED.find((t) => t.slug === "particulier")!
  const examples = [
    generateContentDecennaleLocal(macon, paris, "macon:paris"),
    generateContentDecennaleLocal(plombier, lyon, "plombier:lyon"),
    generateContentDoLocal(particulier, paris, "particulier:paris"),
  ]
  console.log("→ Mode --dry-run : aucun appel Supabase.\n")
  console.log(
    `→ Volume théorique : ${METIERS_SEED.length} métiers × ${VILLES_FR.length} villes = ${METIERS_SEED.length * VILLES_FR.length} pages décennale ; ` +
      `${TYPES_PROJETS_SEED.length} types × ${VILLES_FR.length} villes = ${TYPES_PROJETS_SEED.length * VILLES_FR.length} pages DO.\n`
  )
  for (const ex of examples) {
    printExample(ex)
  }
}

async function main() {
  const { dryRun, batch } = parseArgs()

  if (dryRun) {
    printDryRunExamples()
    process.exit(0)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!url || !key) {
    console.error(
      "❌ Définissez NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY (ou clé anon avec politiques INSERT)."
    )
    process.exit(1)
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    console.warn(
      "⚠️  SUPABASE_SERVICE_ROLE_KEY manquant : les inserts peuvent échouer si RLS n’autorise pas l’écriture."
    )
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } })

  console.log("→ Upsert métiers, villes, types projets…")

  if (!dryRun) {
    const { error: e1 } = await supabase.from("metiers").upsert(METIERS_SEED, { onConflict: "slug" })
    if (e1) throw e1
    const { error: e2 } = await supabase.from("villes").upsert(VILLES_FR, { onConflict: "slug" })
    if (e2) throw e2
    const { error: e3 } = await supabase
      .from("types_projets")
      .upsert(TYPES_PROJETS_SEED, { onConflict: "slug" })
    if (e3) throw e3
  }

  const { data: metiersRows, error: mErr } = await supabase.from("metiers").select("id, slug")
  if (mErr) throw mErr
  const { data: villesRows, error: vErr } = await supabase.from("villes").select("id, slug")
  if (vErr) throw vErr
  const { data: typesRows, error: tErr } = await supabase.from("types_projets").select("id, slug")
  if (tErr) throw tErr

  const metierId = new Map(metiersRows?.map((r) => [r.slug, r.id] as const) ?? [])
  const villeId = new Map(villesRows?.map((r) => [r.slug, r.id] as const) ?? [])
  const typeId = new Map(typesRows?.map((r) => [r.slug, r.id] as const) ?? [])

  const decennalePayloads: {
    page: GeneratedPage
    metier_id: string
    ville_id: string
  }[] = []

  for (const m of METIERS_SEED) {
    const mid = metierId.get(m.slug)
    if (!mid) {
      console.warn(`Métier manquant en base : ${m.slug}`)
      continue
    }
    for (const v of VILLES_FR) {
      const vid = villeId.get(v.slug)
      if (!vid) {
        console.warn(`Ville manquante en base : ${v.slug}`)
        continue
      }
      const key = `${m.slug}:${v.slug}`
      const page = generateContentDecennaleLocal(m, v, key)
      decennalePayloads.push({ page, metier_id: mid, ville_id: vid })
    }
  }

  const doPayloads: {
    page: GeneratedPage
    type_projet_id: string
    ville_id: string
  }[] = []

  for (const t of TYPES_PROJETS_SEED) {
    const tid = typeId.get(t.slug)
    if (!tid) {
      console.warn(`Type projet manquant : ${t.slug}`)
      continue
    }
    for (const v of VILLES_FR) {
      const vid = villeId.get(v.slug)
      if (!vid) continue
      const key = `${t.slug}:${v.slug}`
      const page = generateContentDoLocal(t, v, key)
      doPayloads.push({ page, type_projet_id: tid, ville_id: vid })
    }
  }

  console.log(
    `→ Généré : ${decennalePayloads.length} pages décennale × ville, ${doPayloads.length} pages DO × ville (dry-run=${dryRun})`
  )

  const examples: GeneratedPage[] = [
    decennalePayloads.find((p) => p.page.slug.includes(":macon:paris"))?.page ??
      decennalePayloads[0]?.page,
    decennalePayloads.find((p) => p.page.slug.includes(":plombier:lyon"))?.page ??
      decennalePayloads[1]?.page,
    doPayloads.find((p) => p.page.slug.includes(":particulier:paris"))?.page ?? doPayloads[0]?.page,
  ].filter(Boolean) as GeneratedPage[]

  if (dryRun) {
    console.log("\n--- Exemple (3 pages) — non inséré ---\n")
    for (const ex of examples) {
      printExample(ex)
    }
    process.exit(0)
  }

  const contenusRows = [
    ...decennalePayloads.map((x) => toContenuRow(x.page)),
    ...doPayloads.map((x) => toContenuRow(x.page)),
  ]

  const decennaleJunction = decennalePayloads.map((x) => ({
    metier_id: x.metier_id,
    ville_id: x.ville_id,
    body_extra: x.page.body_main,
    indexable: true,
    content_hash: x.page.content_hash,
  }))

  const doJunction = doPayloads.map((x) => ({
    type_projet_id: x.type_projet_id,
    ville_id: x.ville_id,
    body_extra: x.page.body_main,
    indexable: true,
    content_hash: x.page.content_hash,
  }))

  console.log("→ Insert contenus_seo par lots…")
  for (const part of chunk(contenusRows, batch)) {
    const { error } = await supabase.from("contenus_seo").upsert(part, {
      onConflict: "slug",
    })
    if (error) {
      console.error("Erreur contenus_seo :", error.message)
      if (error.message.includes("slug")) {
        console.error("Avez-vous exécuté sql/supabase-contenus-seo-slug.sql ?")
      }
      process.exit(1)
    }
  }

  console.log("→ Upsert seo_decennale_ville…")
  for (const part of chunk(decennaleJunction, batch)) {
    const { error } = await supabase.from("seo_decennale_ville").upsert(part, {
      onConflict: "metier_id,ville_id",
    })
    if (error) {
      console.error("Erreur seo_decennale_ville :", error.message)
      process.exit(1)
    }
  }

  console.log("→ Upsert seo_do_ville…")
  for (const part of chunk(doJunction, batch)) {
    const { error } = await supabase.from("seo_do_ville").upsert(part, {
      onConflict: "type_projet_id,ville_id",
    })
    if (error) {
      console.error("Erreur seo_do_ville :", error.message)
      process.exit(1)
    }
  }

  console.log("\n✅ Terminé — contenus SEO + tables de liaison à jour.\n")
  console.log("--- Exemples générés (aperçu) ---\n")
  for (const ex of examples) {
    printExample(ex)
  }
}

function toContenuRow(page: GeneratedPage) {
  return {
    slug: page.slug,
    type_page: page.type_page,
    title: page.title,
    meta_description: page.meta_description,
    h1: page.h1,
    contenu: page.contenu,
  }
}

function printExample(page: GeneratedPage) {
  console.log("slug:", page.slug)
  console.log("title:", page.title)
  console.log("meta:", page.meta_description)
  console.log("h1:", page.h1)
  console.log("extrait contenu:\n", page.contenu.slice(0, 900), page.contenu.length > 900 ? "…" : "")
  console.log("---\n")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
