import { DO_SEO } from "@/lib/dommage-ouvrage-seo"
import { METIERS_SEO } from "@/lib/metiers-seo"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { FALLBACK_BODY_MACON_PARIS, FALLBACK_DO_PARTICULIER_PARIS } from "./content"
import type { DecennaleLocalPayload, DoLocalPayload, InternalLink } from "./types"

/** Villes servies en mode démo sans Supabase (alignées sur sql/supabase-seo-remplissage-copier-coller.sql). */
const FALLBACK_VILLE_BY_SLUG: Record<string, { nom: string; population: number }> = {
  paris: { nom: "Paris", population: 2_161_000 },
  lyon: { nom: "Lyon", population: 522_000 },
  marseille: { nom: "Marseille", population: 870_000 },
  toulouse: { nom: "Toulouse", population: 490_000 },
  nice: { nom: "Nice", population: 350_000 },
  nantes: { nom: "Nantes", population: 320_000 },
  montpellier: { nom: "Montpellier", population: 290_000 },
  strasbourg: { nom: "Strasbourg", population: 290_000 },
  bordeaux: { nom: "Bordeaux", population: 260_000 },
  lille: { nom: "Lille", population: 235_000 },
  rennes: { nom: "Rennes", population: 220_000 },
  reims: { nom: "Reims", population: 185_000 },
  "saint-etienne": { nom: "Saint-Étienne", population: 175_000 },
  "le-havre": { nom: "Le Havre", population: 170_000 },
  grenoble: { nom: "Grenoble", population: 160_000 },
}

function metierFromStatic(slug: string) {
  return METIERS_SEO.find((m) => m.slug === slug) ?? null
}

function doFromStatic(slug: string) {
  return DO_SEO.find((d) => d.slug === slug) ?? null
}

/** Page locale sans ligne metiers/villes en base (RLS, import incomplet) : mêmes contenus que sans client Supabase. */
function decennaleSyntheticFallback(
  staticMetier: (typeof METIERS_SEO)[number],
  villeSlug: string
): DecennaleLocalPayload | null {
  const v = FALLBACK_VILLE_BY_SLUG[villeSlug]
  if (!v) return null
  const bodyExtra =
    staticMetier.slug === "macon" && villeSlug === "paris" ? FALLBACK_BODY_MACON_PARIS : null
  return {
    metierSlug: staticMetier.slug,
    metierNom: staticMetier.nom,
    villeSlug,
    villeNom: v.nom,
    population: v.population,
    description: staticMetier.description,
    risques: null,
    prixIndicatif: `À partir de ${staticMetier.prixMin} €/mois (équivalent)`,
    bodyExtra,
    indexable: true,
    contentHash: null,
  }
}

function doSyntheticFallback(
  staticDo: (typeof DO_SEO)[number],
  villeSlug: string
): DoLocalPayload | null {
  const v = FALLBACK_VILLE_BY_SLUG[villeSlug]
  if (!v) return null
  const bodyExtra =
    staticDo.slug === "particulier" && villeSlug === "paris" ? FALLBACK_DO_PARTICULIER_PARIS : null
  return {
    slug: staticDo.slug,
    nom: staticDo.nom,
    villeSlug,
    villeNom: v.nom,
    population: v.population,
    description: staticDo.description,
    bodyExtra,
    indexable: true,
    contentHash: null,
  }
}

/** Supabase peut typer les relations embarquées comme tableaux ; on normalise. */
function embedSlug(rel: { slug: string } | { slug: string }[] | null | undefined): string | null {
  if (rel == null) return null
  const o = Array.isArray(rel) ? rel[0] : rel
  return o?.slug ?? null
}

function embedOne<T>(rel: T | T[] | null | undefined): T | null {
  if (rel == null) return null
  return Array.isArray(rel) ? rel[0] ?? null : rel
}

export async function fetchDecennaleStaticParams(): Promise<{ metier: string; ville: string }[]> {
  try {
    const sb = createSupabaseServerClient()
    if (!sb) {
      return METIERS_SEO.map((m) => ({ metier: m.slug, ville: "paris" }))
    }

    const { data, error } = await sb
    .from("seo_decennale_ville")
    .select(
      `
      indexable,
      metiers!inner ( slug ),
      villes!inner ( slug )
    `
    )
    .eq("indexable", true)
    .limit(12_000)

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[seo-programmatic] fetchDecennaleStaticParams:", error.message)
    }
    return []
  }
  if (!data?.length) return []

  return data
    .filter((row) => row.indexable !== false)
    .map((row) => {
      const metier = embedSlug(
        row.metiers as { slug: string } | { slug: string }[] | null | undefined
      )
      const ville = embedSlug(
        row.villes as { slug: string } | { slug: string }[] | null | undefined
      )
      if (!metier || !ville) return null
      return { metier, ville }
    })
    .filter((p): p is { metier: string; ville: string } => p != null)
  } catch (e) {
    console.error("[seo-programmatic] fetchDecennaleStaticParams:", e)
    return METIERS_SEO.map((m) => ({ metier: m.slug, ville: "paris" }))
  }
}

export async function fetchDoStaticParams(): Promise<{ slug: string; ville: string }[]> {
  try {
    const sb = createSupabaseServerClient()
    if (!sb) {
      return DO_SEO.map((d) => ({ slug: d.slug, ville: "paris" }))
    }

    const { data, error } = await sb
    .from("seo_do_ville")
    .select(
      `
      indexable,
      types_projets!inner ( slug ),
      villes!inner ( slug )
    `
    )
    .eq("indexable", true)
    .limit(12_000)

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[seo-programmatic] fetchDoStaticParams:", error.message)
    }
    return []
  }
  if (!data?.length) return []

  return data
    .filter((row) => row.indexable !== false)
    .map((row) => {
      const slug = embedSlug(
        row.types_projets as { slug: string } | { slug: string }[] | null | undefined
      )
      const ville = embedSlug(
        row.villes as { slug: string } | { slug: string }[] | null | undefined
      )
      if (!slug || !ville) return null
      return { slug, ville }
    })
    .filter((p): p is { slug: string; ville: string } => p != null)
  } catch (e) {
    console.error("[seo-programmatic] fetchDoStaticParams:", e)
    return DO_SEO.map((d) => ({ slug: d.slug, ville: "paris" }))
  }
}

export async function getDecennaleLocalPage(
  metierSlug: string,
  villeSlug: string
): Promise<DecennaleLocalPayload | null> {
  const staticMetier = metierFromStatic(metierSlug)
  if (!staticMetier) return null

  const sb = createSupabaseServerClient()
  if (!sb) {
    return decennaleSyntheticFallback(staticMetier, villeSlug)
  }

  const { data: metierRow } = await sb.from("metiers").select("id").eq("slug", metierSlug).maybeSingle()
  const { data: villeRow } = await sb.from("villes").select("id").eq("slug", villeSlug).maybeSingle()
  if (!metierRow?.id || !villeRow?.id) {
    const synthetic = decennaleSyntheticFallback(staticMetier, villeSlug)
    if (synthetic) return synthetic
    return null
  }

  const { data, error } = await sb
    .from("seo_decennale_ville")
    .select(
      `
      body_extra,
      indexable,
      content_hash,
      metiers ( nom, slug, description, risques, prix_moyen ),
      villes ( nom, slug, population )
    `
    )
    .eq("metier_id", metierRow.id)
    .eq("ville_id", villeRow.id)
    .maybeSingle()

  if (error) return null

  if (!data) {
    const { data: mFull } = await sb
      .from("metiers")
      .select("nom, slug, description, risques, prix_moyen")
      .eq("id", metierRow.id)
      .maybeSingle()
    const { data: vFull } = await sb
      .from("villes")
      .select("nom, slug, population")
      .eq("id", villeRow.id)
      .maybeSingle()
    if (!mFull || !vFull) return null
    const prix =
      mFull.prix_moyen != null
        ? `Prime annuelle indicative : à partir de ${Math.round(Number(mFull.prix_moyen))} €/an (selon CA et sinistralité)`
        : `À partir de ${staticMetier.prixMin} €/mois (équivalent)`
    return {
      metierSlug: mFull.slug,
      metierNom: mFull.nom,
      villeSlug: vFull.slug,
      villeNom: vFull.nom,
      population: vFull.population,
      description: mFull.description ?? staticMetier.description,
      risques: mFull.risques,
      prixIndicatif: prix,
      bodyExtra: null,
      indexable: true,
      contentHash: null,
    }
  }

  const m = embedOne(
    data.metiers as unknown as
      | {
          nom: string
          slug: string
          description: string | null
          risques: string | null
          prix_moyen: number | null
        }
      | null
  )
  const v = embedOne(
    data.villes as unknown as { nom: string; slug: string; population: number | null } | null
  )
  if (!m || !v) return null

  const prix =
    m.prix_moyen != null
      ? `Prime annuelle indicative : à partir de ${Math.round(Number(m.prix_moyen))} €/an (selon CA et sinistralité)`
      : `À partir de ${staticMetier.prixMin} €/mois (équivalent)`

  return {
    metierSlug: m.slug,
    metierNom: m.nom,
    villeSlug: v.slug,
    villeNom: v.nom,
    population: v.population,
    description: m.description ?? staticMetier.description,
    risques: m.risques,
    prixIndicatif: prix,
    bodyExtra: data.body_extra as string | null,
    indexable: data.indexable !== false,
    contentHash: (data.content_hash as string | null) ?? null,
  }
}

export async function getDoLocalPage(slug: string, villeSlug: string): Promise<DoLocalPayload | null> {
  const staticDo = doFromStatic(slug)
  if (!staticDo) return null

  const sb = createSupabaseServerClient()
  if (!sb) {
    return doSyntheticFallback(staticDo, villeSlug)
  }

  const { data: typeRow } = await sb.from("types_projets").select("id").eq("slug", slug).maybeSingle()
  const { data: villeRow } = await sb.from("villes").select("id").eq("slug", villeSlug).maybeSingle()
  if (!typeRow?.id || !villeRow?.id) {
    const synthetic = doSyntheticFallback(staticDo, villeSlug)
    if (synthetic) return synthetic
    return null
  }

  const { data, error } = await sb
    .from("seo_do_ville")
    .select(
      `
      body_extra,
      indexable,
      content_hash,
      types_projets ( nom, slug, description ),
      villes ( nom, slug, population )
    `
    )
    .eq("type_projet_id", typeRow.id)
    .eq("ville_id", villeRow.id)
    .maybeSingle()

  if (error) return null

  if (!data) {
    const { data: tFull } = await sb
      .from("types_projets")
      .select("nom, slug, description")
      .eq("id", typeRow.id)
      .maybeSingle()
    const { data: vFull } = await sb
      .from("villes")
      .select("nom, slug, population")
      .eq("id", villeRow.id)
      .maybeSingle()
    if (!tFull || !vFull) return null
    return {
      slug: tFull.slug,
      nom: tFull.nom,
      villeSlug: vFull.slug,
      villeNom: vFull.nom,
      population: vFull.population,
      description: tFull.description ?? staticDo.description,
      bodyExtra: null,
      indexable: true,
      contentHash: null,
    }
  }

  const t = embedOne(
    data.types_projets as unknown as {
      nom: string
      slug: string
      description: string | null
    } | null
  )
  const v = embedOne(
    data.villes as unknown as { nom: string; slug: string; population: number | null } | null
  )
  if (!t || !v) return null

  return {
    slug: t.slug,
    nom: t.nom,
    villeSlug: v.slug,
    villeNom: v.nom,
    population: v.population,
    description: t.description ?? staticDo.description,
    bodyExtra: data.body_extra as string | null,
    indexable: data.indexable !== false,
    contentHash: (data.content_hash as string | null) ?? null,
  }
}

/** Maillage interne : autres métiers pour la même ville. */
export async function fetchDecennaleSiblingMetiers(
  villeSlug: string,
  currentMetierSlug: string,
  limit = 6
): Promise<InternalLink[]> {
  const sb = createSupabaseServerClient()
  if (!sb) {
    return METIERS_SEO.filter((m) => m.slug !== currentMetierSlug)
      .slice(0, limit)
      .map((m) => ({
        href: `/assurance-decennale/${m.slug}/${villeSlug}`,
        label: `Décennale ${m.nom}`,
      }))
  }

  const { data: villeRow } = await sb.from("villes").select("id").eq("slug", villeSlug).maybeSingle()
  if (!villeRow?.id) return []

  const { data } = await sb
    .from("seo_decennale_ville")
    .select(
      `
      metiers ( slug, nom )
    `
    )
    .eq("ville_id", villeRow.id)
    .eq("indexable", true)
    .limit(48)

  if (!data?.length) return []

  return data
    .map((row) => {
      const met = embedOne(
        row.metiers as unknown as { slug: string; nom: string } | null
      )
      if (!met || met.slug === currentMetierSlug) return null
      return {
        href: `/assurance-decennale/${met.slug}/${villeSlug}`,
        label: `Décennale ${met.nom}`,
      }
    })
    .filter((x): x is InternalLink => x != null)
    .slice(0, limit)
}

/** Maillage interne : autres villes pour le même métier. */
export async function fetchDecennaleSiblingVilles(
  metierSlug: string,
  currentVilleSlug: string,
  limit = 8
): Promise<InternalLink[]> {
  const sb = createSupabaseServerClient()
  if (!sb) {
    return Object.keys(FALLBACK_VILLE_BY_SLUG)
      .filter((s) => s !== currentVilleSlug)
      .map((s) => ({
        href: `/assurance-decennale/${metierSlug}/${s}`,
        label: FALLBACK_VILLE_BY_SLUG[s].nom,
      }))
  }

  const { data: metierRow } = await sb.from("metiers").select("id").eq("slug", metierSlug).maybeSingle()
  if (!metierRow?.id) return []

  const { data } = await sb
    .from("seo_decennale_ville")
    .select(
      `
      villes ( slug, nom )
    `
    )
    .eq("metier_id", metierRow.id)
    .eq("indexable", true)
    .limit(48)

  if (!data?.length) return []

  return data
    .map((row) => {
      const ville = embedOne(
        row.villes as unknown as { slug: string; nom: string } | null
      )
      if (!ville || ville.slug === currentVilleSlug) return null
      return {
        href: `/assurance-decennale/${metierSlug}/${ville.slug}`,
        label: ville.nom,
      }
    })
    .filter((x): x is InternalLink => x != null)
    .slice(0, limit)
}

/** Maillage interne : autres villes pour le même type DO. */
export async function fetchDoSiblingVilles(
  slug: string,
  currentVilleSlug: string,
  limit = 8
): Promise<InternalLink[]> {
  const sb = createSupabaseServerClient()
  if (!sb) {
    return Object.keys(FALLBACK_VILLE_BY_SLUG)
      .filter((s) => s !== currentVilleSlug)
      .map((s) => ({
        href: `/dommage-ouvrage/${slug}/${s}`,
        label: FALLBACK_VILLE_BY_SLUG[s].nom,
      }))
  }

  const { data: typeRow } = await sb.from("types_projets").select("id").eq("slug", slug).maybeSingle()
  if (!typeRow?.id) return []

  const { data } = await sb
    .from("seo_do_ville")
    .select(
      `
      villes ( slug, nom )
    `
    )
    .eq("type_projet_id", typeRow.id)
    .eq("indexable", true)
    .limit(48)

  if (!data?.length) return []

  return data
    .map((row) => {
      const ville = embedOne(
        row.villes as unknown as { slug: string; nom: string } | null
      )
      if (!ville || ville.slug === currentVilleSlug) return null
      return {
        href: `/dommage-ouvrage/${slug}/${ville.slug}`,
        label: ville.nom,
      }
    })
    .filter((x): x is InternalLink => x != null)
    .slice(0, limit)
}

/** Limite les URLs programmatiques dans le sitemap (évite timeout serverless / réponse trop lourde). */
const PROGRAMMATIC_SITEMAP_MAX = 5000
/** Si Supabase est lent, on préfère un sitemap partiel (pages statiques inchangées) qu’un 504. */
const PROGRAMMATIC_SITEMAP_FETCH_MS = 12_000

function fallbackProgrammaticSitemapUrls(): {
  path: string
  changeFrequency: "weekly" | "monthly"
  priority: number
}[] {
  const out: { path: string; changeFrequency: "weekly" | "monthly"; priority: number }[] = []
  const villeSlugs = Object.keys(FALLBACK_VILLE_BY_SLUG)

  for (const metier of METIERS_SEO) {
    for (const ville of villeSlugs) {
      if (out.length >= PROGRAMMATIC_SITEMAP_MAX) return out
      out.push({
        path: `/assurance-decennale/${metier.slug}/${ville}`,
        changeFrequency: "monthly",
        priority: metier.kind === "headterm" ? 0.74 : 0.7,
      })
    }
  }

  for (const doPage of DO_SEO) {
    for (const ville of villeSlugs) {
      if (out.length >= PROGRAMMATIC_SITEMAP_MAX) return out
      out.push({
        path: `/dommage-ouvrage/${doPage.slug}/${ville}`,
        changeFrequency: "monthly",
        priority: 0.72,
      })
    }
  }

  return out
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let id: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    id = setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => {
    if (id !== undefined) clearTimeout(id)
  }) as Promise<T>
}

export async function fetchProgrammaticSitemapUrls(): Promise<
  { path: string; changeFrequency: "weekly" | "monthly"; priority: number }[]
> {
  try {
    const [dec, ddo] = await withTimeout(
      Promise.all([fetchDecennaleStaticParams(), fetchDoStaticParams()]),
      PROGRAMMATIC_SITEMAP_FETCH_MS
    )
    const out: { path: string; changeFrequency: "weekly" | "monthly"; priority: number }[] = []
    for (const p of dec) {
      if (out.length >= PROGRAMMATIC_SITEMAP_MAX) break
      out.push({
        path: `/assurance-decennale/${p.metier}/${p.ville}`,
        changeFrequency: "monthly",
        priority: 0.72,
      })
    }
    for (const p of ddo) {
      if (out.length >= PROGRAMMATIC_SITEMAP_MAX) break
      out.push({
        path: `/dommage-ouvrage/${p.slug}/${p.ville}`,
        changeFrequency: "monthly",
        priority: 0.72,
      })
    }
    return out.length ? out : fallbackProgrammaticSitemapUrls()
  } catch (e) {
    console.error("[seo-programmatic] fetchProgrammaticSitemapUrls:", e)
    return fallbackProgrammaticSitemapUrls()
  }
}
