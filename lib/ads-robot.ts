import { createOpenAIClient, getDefaultOpenAIModel } from "@/lib/openai"

export type AdsProduct = "decennale" | "dommage-ouvrage" | "les-deux"

export type AdsBrief = {
  product: AdsProduct
  city?: string
  angle?: string
}

export type GoogleAd = {
  headlines: string[]
  descriptions: string[]
}

export type MetaAd = {
  primaryText: string
  headline: string
  description: string
  cta: string
}

export type TikTokAd = {
  hook: string
  script: string[]
  caption: string
  hashtags: string[]
}

export type AdsPack = {
  product: AdsProduct
  source: "openai" | "modele"
  google: GoogleAd
  meta: MetaAd
  tiktok: TikTokAd
  mentions: string[]
  warning?: string
}

const LIMITS = {
  googleHeadline: 30,
  googleDescription: 90,
  metaPrimary: 220,
  metaHeadline: 40,
  metaDescription: 30,
  tiktokHook: 80,
  tiktokLine: 90,
  tiktokCaption: 150,
} as const

const MENTIONS = [
  "Optimum Courtage, courtier en assurances, immatriculé à l'ORIAS.",
  "Sous réserve d'acceptation du dossier et de validation de l'assureur.",
  "L'attestation n'est remise qu'après contrôle du dossier.",
]

export function fitAdText(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").replace(/["«»]/g, "").trim()
  if (clean.length <= max) return clean
  const slice = clean.slice(0, max + 1)
  const space = slice.lastIndexOf(" ")
  const cut = (space > Math.floor(max * 0.6) ? slice.slice(0, space) : clean.slice(0, max)).trim()
  return cut.replace(/[.,;:!?-]+$/, "").trim()
}

export function normalizeAdsProduct(value: unknown): AdsProduct {
  if (value === "dommage-ouvrage" || value === "les-deux") return value
  return "decennale"
}

function cleanField(value: unknown, max: number): string {
  if (typeof value !== "string") return ""
  return fitAdText(value, max)
}

function productFacts(product: AdsProduct, city: string): { title: string; price: string; promise: string } {
  const place = city ? ` à ${city}` : ""
  if (product === "dommage-ouvrage") {
    return {
      title: `Dommage ouvrage${place}`,
      price: "Devis en une fois",
      promise: "Chantier couvert après accord",
    }
  }
  if (product === "les-deux") {
    return {
      title: `Décennale et DO${place}`,
      price: "Devis BTP en ligne",
      promise: "Deux contrats, un courtier",
    }
  }
  return {
    title: `Décennale${place}`,
    price: "Dès 50 € / mois",
    promise: "Puis prélèvement mensuel",
  }
}

function templatePack(brief: AdsBrief): AdsPack {
  const city = cleanField(brief.city, 24)
  const angle = cleanField(brief.angle, 40)
  const facts = productFacts(brief.product, city)
  const audience = brief.product === "dommage-ouvrage" ? "Maîtres d'ouvrage" : "Artisans du BTP"
  const googleHeadlines = [
    facts.title,
    facts.price,
    "Devis en ligne",
    "Courtier ORIAS",
    facts.promise,
    audience,
    angle || "Dossier étudié vite",
    "Optimum Assurance",
  ]
  const googleDescriptions = [
    brief.product === "dommage-ouvrage"
      ? "Assurance dommage ouvrage pour votre chantier. Devis en ligne, paiement en une fois après accord."
      : "Assurance décennale pour les entreprises du BTP. Premier mois par carte, puis prélèvement mensuel.",
    "Courtier ORIAS. Le dossier est contrôlé avant toute attestation. Sous réserve d'acceptation.",
    angle
      ? `${angle}. Préparez votre devis sur optimum-assurance.fr.`
      : "Préparez votre devis sur optimum-assurance.fr, sans engagement tant que le dossier n'est pas accepté.",
  ]
  const metaPrimary =
    brief.product === "dommage-ouvrage"
      ? `Votre chantier${city ? ` à ${city}` : ""} a besoin d'une dommage ouvrage ? Optimum Assurance prépare le devis en ligne. Le contrat est payé en une fois, après accord de l'assureur. Courtier ORIAS.`
      : `Votre entreprise du BTP${city ? ` à ${city}` : ""} a besoin d'une décennale ? Optimum Assurance prépare le devis en ligne. Premier mois par carte, puis prélèvement mensuel. L'attestation suit le contrôle du dossier.`

  return {
    product: brief.product,
    source: "modele",
    google: {
      headlines: uniqueLimited(googleHeadlines, LIMITS.googleHeadline, 8),
      descriptions: uniqueLimited(googleDescriptions, LIMITS.googleDescription, 3),
    },
    meta: {
      primaryText: fitAdText(metaPrimary, LIMITS.metaPrimary),
      headline: fitAdText(facts.title, LIMITS.metaHeadline),
      description: fitAdText(facts.price, LIMITS.metaDescription),
      cta: "Demander un devis",
    },
    tiktok: {
      hook: fitAdText(
        brief.product === "dommage-ouvrage"
          ? `Ton chantier${city ? ` à ${city}` : ""}, et la dommage ouvrage ?`
          : `Ta décennale${city ? ` à ${city}` : ""}, dès 50 € par mois.`,
        LIMITS.tiktokHook
      ),
      script: [
        "Tu ouvres le devis sur Optimum Assurance.",
        brief.product === "dommage-ouvrage"
          ? "Tu indiques le chantier. Le paiement se fait en une fois, après accord."
          : "Premier mois par carte, puis prélèvement mensuel.",
        "L'attestation arrive seulement après le contrôle du dossier.",
      ].map((line) => fitAdText(line, LIMITS.tiktokLine)),
      caption: fitAdText(
        `${facts.title}. Devis en ligne, courtier ORIAS, sous réserve d'acceptation.`,
        LIMITS.tiktokCaption
      ),
      hashtags: hashtagsFor(brief.product),
    },
    mentions: MENTIONS,
  }
}

function uniqueLimited(values: string[], max: number, count: number): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const text = fitAdText(value, max)
    const key = text.toLowerCase()
    if (!text || seen.has(key)) continue
    seen.add(key)
    out.push(text)
    if (out.length >= count) break
  }
  return out
}

function hashtagsFor(product: AdsProduct): string[] {
  if (product === "dommage-ouvrage") {
    return ["#DommageOuvrage", "#Chantier", "#MaitreDOuvrage", "#DevisEnLigne", "#OptimumAssurance"]
  }
  if (product === "les-deux") {
    return ["#AssuranceDecennale", "#DommageOuvrage", "#BTP", "#DevisEnLigne", "#OptimumAssurance"]
  }
  return ["#AssuranceDecennale", "#BTP", "#Artisan", "#DevisEnLigne", "#OptimumAssurance"]
}

function asStringList(value: unknown, max: number, count: number, fallback: string[]): string[] {
  const source = Array.isArray(value) ? value : fallback
  const fitted = uniqueLimited(source.map((item) => String(item)), max, count)
  return fitted.length > 0 ? fitted : uniqueLimited(fallback, max, count)
}

function clampPack(raw: Partial<AdsPack> | null, brief: AdsBrief): AdsPack {
  const fallback = templatePack(brief)
  const google = raw?.google
  const meta = raw?.meta
  const tiktok = raw?.tiktok
  return {
    product: brief.product,
    source: "openai",
    google: {
      headlines: asStringList(google?.headlines, LIMITS.googleHeadline, 8, fallback.google.headlines),
      descriptions: asStringList(google?.descriptions, LIMITS.googleDescription, 4, fallback.google.descriptions),
    },
    meta: {
      primaryText: fitAdText(meta?.primaryText || fallback.meta.primaryText, LIMITS.metaPrimary),
      headline: fitAdText(meta?.headline || fallback.meta.headline, LIMITS.metaHeadline),
      description: fitAdText(meta?.description || fallback.meta.description, LIMITS.metaDescription),
      cta: fitAdText(meta?.cta || fallback.meta.cta, 24) || fallback.meta.cta,
    },
    tiktok: {
      hook: fitAdText(tiktok?.hook || fallback.tiktok.hook, LIMITS.tiktokHook),
      script: asStringList(tiktok?.script, LIMITS.tiktokLine, 4, fallback.tiktok.script),
      caption: fitAdText(tiktok?.caption || fallback.tiktok.caption, LIMITS.tiktokCaption),
      hashtags: hashtagsFor(brief.product),
    },
    mentions: MENTIONS,
  }
}

export async function generateAdsPack(brief: AdsBrief): Promise<AdsPack> {
  const safe: AdsBrief = {
    product: normalizeAdsProduct(brief.product),
    city: cleanField(brief.city, 24),
    angle: cleanField(brief.angle, 40),
  }
  const client = createOpenAIClient()
  if (!client) return templatePack(safe)

  try {
    const response = await client.chat.completions.create({
      model: getDefaultOpenAIModel(),
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Tu rédiges des publicités pour Optimum Assurance, courtier ORIAS. Réponds uniquement en JSON. " +
            "N'invente aucun prix autre que « dès 50 € / mois » pour la décennale. " +
            "N'affirme jamais qu'une attestation est immédiate. " +
            "Rappelle que le dossier est contrôlé et soumis à acceptation. " +
            "Google : headlines de 30 caractères maximum, descriptions de 90 maximum. " +
            "Meta : primaryText 220, headline 40, description 30. " +
            "TikTok : hook 80, 3 lignes de script de 90, caption 150. Vouvoiement Google et Meta, tutoiement TikTok.",
        },
        {
          role: "user",
          content: JSON.stringify({
            produit: safe.product,
            ville: safe.city || null,
            angle: safe.angle || null,
            format: {
              google: { headlines: ["8 textes"], descriptions: ["3 textes"] },
              meta: { primaryText: "", headline: "", description: "", cta: "Demander un devis" },
              tiktok: { hook: "", script: ["", "", ""], caption: "" },
            },
          }),
        },
      ],
    })
    const content = response.choices[0]?.message?.content
    if (!content) return templatePack(safe)
    const parsed = JSON.parse(content) as Partial<AdsPack>
    return clampPack(parsed, safe)
  } catch {
    return {
      ...templatePack(safe),
      warning: "Le modèle n'a pas répondu. Textes de secours utilisés.",
    }
  }
}

export const ADS_LIMITS = LIMITS
