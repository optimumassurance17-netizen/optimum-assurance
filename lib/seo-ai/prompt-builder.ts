import { createHash } from "crypto"
import type { AiTone, MetierContext, TypeProjetContext, VilleContext } from "./types"

const ANGLES_DECENNALE = [
  "mise en conformité et obligations légales (loi Spinetta)",
  "prix, prime et pilotage du coût décennale",
  "réception de chantier, attestation et relation maître d’ouvrage",
  "sinistralité, garanties et exclusions à connaître",
  "jeunes entreprises et évolution d’activité",
] as const

const ANGLES_DO = [
  "calendrier de souscription et pièces administratives",
  "périmètre de garantie et coût de construction",
  "réception et durée de protection",
  "profil du maître d’ouvrage et cas fréquents",
  "comparaison avec autres garanties (dommages ouvrage vs autres)",
] as const

const TONE_HINT: Record<AiTone, string> = {
  premium:
    "Ton premium : précision juridique, vocabulaire maîtrisé, phrases fluides, confiance haut de gamme. Éviter le superlatif creux.",
  accessible:
    "Ton accessible : phrases courtes, exemples concrets, pédagogie sans infantiliser. Toujours professionnel.",
}

function hashSeed(parts: string[]): string {
  return createHash("sha256").update(parts.join("|"), "utf8").digest("hex").slice(0, 16)
}

function pickAngle<T extends readonly string[]>(angles: T, seed: string): T[number] {
  const i = parseInt(seed.slice(0, 8), 16) % angles.length
  return angles[i]!
}

/**
 * Anti-duplicate : angle + variation de consigne + seed unique par couple métier/ville.
 */
export function buildDecennaleUserPrompt(
  metier: MetierContext,
  ville: VilleContext,
  tone: AiTone,
  variationIndex: number
): { userPrompt: string; angle: string; seed: string } {
  const seed = hashSeed([metier.slug, ville.slug, String(variationIndex), "dec"])
  const angle = pickAngle(ANGLES_DECENNALE, seed)
  const pop =
    ville.population != null
      ? `Population indicative de l’agglomération : environ ${ville.population.toLocaleString("fr-FR")} habitants.`
      : ""

  const ctxMetier = [
    metier.description_courte ? `Contexte activité : ${metier.description_courte}` : "",
    metier.risques_typiques ? `Risques typiques à mentionner avec prudence : ${metier.risques_typiques}` : "",
  ]
    .filter(Boolean)
    .join("\n")

  const userPrompt = `
Données injectées (ne pas inventer de chiffres précis de prime sans les qualifier comme indicatifs) :
- Métier : ${metier.nom}
- Ville ciblée : ${ville.nom}
${pop}
${ctxMetier}

Angle éditorial principal à développer : ${angle}.
Variation de structure n°${variationIndex + 1} (alterne l’ordre des sections pour éviter tout duplicate).

${TONE_HINT[tone]}

Exigences de rédaction :
- Longueur totale 800 à 1500 mots en français.
- Structure claire avec # pour le titre principal unique, ## et ### pour les sous-parties (Markdown).
- Inclure au moins un tableau Markdown (pipe |) OU une liste à puces dense sur les obligations / pièces.
- Sections types : enjeux locaux, obligations, prix/prime (indicatif), conseils pratiques, pourquoi demander un devis en ligne chez un spécialiste construction.
- FAQ : 5 à 7 questions, réponses utiles (rich snippets), sans remplissage.
- Mots-clés secondaires : liste de 8 à 12 expressions naturelles (pas de bourrage).
- CTA conversion discret vers un devis assurance (sans URL inventée ; mentionner « devis en ligne » / « parcours souscription »).

Réponds UNIQUEMENT avec un JSON valide respectant le schéma indiqué par le système.
`.trim()

  return { userPrompt, angle, seed }
}

export function buildDOUserPrompt(
  typeProjet: TypeProjetContext,
  ville: VilleContext,
  tone: AiTone,
  variationIndex: number
): { userPrompt: string; angle: string; seed: string } {
  const seed = hashSeed([typeProjet.slug, ville.slug, String(variationIndex), "do"])
  const angle = pickAngle(ANGLES_DO, seed)
  const pop =
    ville.population != null
      ? `Contexte démographique : agglomération d’environ ${ville.population.toLocaleString("fr-FR")} habitants.`
      : ""

  const ctx = typeProjet.description_courte
    ? `Profil maître d’ouvrage : ${typeProjet.description_courte}`
    : ""

  const userPrompt = `
Données injectées :
- Type de projet / profil : ${typeProjet.nom}
- Ville : ${ville.nom}
${pop}
${ctx}

Angle éditorial principal : ${angle}.
Variation structure n°${variationIndex + 1}.

${TONE_HINT[tone]}

Exigences :
- 800 à 1500 mots, Markdown (# titre, ## ###), français.
- Au moins une liste numérotée ou un tableau sur les étapes ou garanties.
- Obligation légale, périmètre DO, prime selon coût de construction (indicatif).
- FAQ 5 à 7 questions.
- 8 à 12 mots-clés secondaires.
- CTA devis dommage ouvrage sans URL fictive.

JSON uniquement, schéma système.
`.trim()

  return { userPrompt, angle, seed }
}

export const SYSTEM_PROMPT_JSON = `Tu es un expert en assurance construction (décennale, dommage ouvrage) et rédacteur SEO senior pour le marché français.

Règles absolues :
- Contenu unique, factuellement prudent : pas d’affirmations juridiques absolues sans nuance.
- Ne pas copier-coller des formulations génériques : varier syntaxe, exemples, transitions.
- Marque : tu écris pour « Optimum Assurance », spécialiste construction (pas une marketplace généraliste).
- Pas de HTML dans le JSON sauf si demandé ailleurs ; ici le champ content_markdown est en Markdown.

Réponds par un JSON avec exactement ces clés :
{
  "title": "string (≤ 65 car. pour SERP, optimisé CTR)",
  "meta_description": "string (140–160 car., persuasive)",
  "h1": "string (unique, naturel)",
  "content_markdown": "string (corps complet Markdown)",
  "faq": [ { "q": "string", "r": "string" } ],
  "secondary_keywords": [ "string" ],
  "angle_editorial": "string (résumé de l’angle traité)"
}
`
