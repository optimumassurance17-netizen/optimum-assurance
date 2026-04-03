/**
 * Génération de contenus SEO uniques (titres, meta, H1, corps, FAQ).
 * Variantes déterministes par clé sémantique → relances idempotentes sans doublons de ton.
 */

import { faker } from "@faker-js/faker"
import { createHash } from "crypto"
import type { MetierSeed, TypeProjetSeed, VilleSeed } from "./seed-data"

export type FaqPair = { q: string; r: string }

export type GeneratedPage = {
  slug: string
  type_page: string
  title: string
  meta_description: string
  h1: string
  /** Corps principal (sans FAQ / CTA), pour injection dans seo_*_ville.body_extra */
  body_main: string
  contenu: string
  faq: FaqPair[]
  content_hash: string
  keywords_secondaires: string[]
}

const BRAND = "Optimum Assurance"

const KW_DECENNALE = [
  "assurance décennale obligatoire",
  "attestation décennale BTP",
  "responsabilité décennale constructeur",
  "loi Spinetta",
  "garantie décennale",
  "devis assurance décennale en ligne",
  "prime décennale au réel",
]

const KW_DO = [
  "assurance dommage ouvrage obligatoire",
  "garantie DO solidité de l’ouvrage",
  "maître d’ouvrage",
  "permis de construire",
  "réception des travaux",
  "devis dommage ouvrage",
  "cautionnement DO",
]

function seedFromKey(key: string): number {
  const h = createHash("sha256").update(key, "utf8").digest()
  return h.readUInt32BE(0)
}

function pickIndex(key: string, modulo: number, salt: string): number {
  const h = createHash("sha256").update(`${key}|${salt}`, "utf8").digest()
  return h.readUInt32BE(0) % modulo
}

/** 5+ variantes de titres décennale local */
export function generateTitleDecennaleLocal(m: MetierSeed, v: VilleSeed, key: string): string {
  const i = pickIndex(key, 6, "title-dec")
  const n = m.nom.toLowerCase()
  const ville = v.nom
  const variants = [
    `Assurance décennale ${m.nom} à ${ville} | Devis en ligne | ${BRAND}`,
    `${m.nom} à ${ville} : décennale BTP et attestation | ${BRAND}`,
    `Décennale ${n} ${ville} — tarif et devis sous 3 minutes | ${BRAND}`,
    `Assurance responsabilité décennale (${ville}) pour ${m.nom} | ${BRAND}`,
    `${ville} : votre assurance décennale ${m.nom} en quelques clics | ${BRAND}`,
    `Devis décennale ${n} — chantiers autour de ${ville} | ${BRAND}`,
  ]
  return variants[i]!
}

export function generateTitleDoLocal(t: TypeProjetSeed, v: VilleSeed, key: string): string {
  const i = pickIndex(key, 6, "title-do")
  const ville = v.nom
  const variants = [
    `Assurance dommage ouvrage ${t.nom} à ${ville} | Devis | ${BRAND}`,
    `DO ${t.nom} — ${ville} : obligation, garanties et devis | ${BRAND}`,
    `Dommage ouvrage à ${ville} pour profil « ${t.nom} » | ${BRAND}`,
    `${ville} : souscription dommage ouvrage avant travaux | ${BRAND}`,
    `Devis DO ${ville} — ${t.nom} | ${BRAND}`,
    `Garantie DO et solidité de l’ouvrage — ${t.nom} (${ville}) | ${BRAND}`,
  ]
  return variants[i]!
}

/** Meta 150–160 car. environ, 5 variantes */
export function generateMetaDecennaleLocal(m: MetierSeed, v: VilleSeed, key: string): string {
  const i = pickIndex(key, 5, "meta-dec")
  const ville = v.nom
  const pop =
    v.population >= 100_000
      ? `Grande agglomération (${ville}) : `
      : v.population >= 50_000
        ? `Secteur ${ville} : `
        : `Zone ${ville} : `
  const prix = Math.round(m.prix_moyen / 12)
  const snippets = [
    `${pop}assurance décennale ${m.nom.toLowerCase()}, devis rapide, attestation pour maître d’ouvrage. Prime indicative d’environ ${prix} €/mois (équivalent). ${BRAND}.`,
    `Besoin d’une décennale ${m.nom.toLowerCase()} à ${ville} ? Obligation nationale, parcours en ligne, réponse claire sur les risques courants. Devis personnalisé.`,
    `${ville} : souscrivez votre assurance décennale BTP pour ${m.nom.toLowerCase()}. Transparence sur la prime, documents conformes, accompagnement chantier.`,
    `Attestation décennale pour ${m.nom.toLowerCase()} près de ${ville}. Nous sécurisons votre conformité (loi Spinetta) avec un devis adapté à votre CA.`,
    `Décennale ${m.nom.toLowerCase()} et chantiers autour de ${ville} : comparatif simple, pas de jargon inutile. ${BRAND}, spécialiste construction.`,
  ]
  let meta = snippets[i]!
  if (meta.length > 168) meta = meta.slice(0, 165) + "…"
  return meta
}

export function generateMetaDoLocal(t: TypeProjetSeed, v: VilleSeed, key: string): string {
  const i = pickIndex(key, 5, "meta-do")
  const ville = v.nom
  const snippets = [
    `Dommage ouvrage à ${ville} pour ${t.nom.toLowerCase()} : obligation avant travaux, garantie solidité. Devis sous 24 h, parcours guidé. ${BRAND}.`,
    `${ville} : assurance DO pour profil « ${t.nom} ». Nous clarifions le périmètre de garantie et le calendrier de souscription.`,
    `Souscription DO ${ville} — ${t.nom}. Protection 10 ans après réception, analyse selon votre projet (coût, surface, typologie).`,
    `Devis dommage ouvrage ${ville} : ${t.nom.toLowerCase()}, pièces attendues et étapes avant le démarrage du chantier.`,
    `${BRAND} accompagne les maîtres d’ouvrage à ${ville} (${t.nom}). Prime selon le coût de construction et les garanties choisies.`,
  ]
  let meta = snippets[i]!
  if (meta.length > 168) meta = meta.slice(0, 165) + "…"
  return meta
}

export function generateH1DecennaleLocal(m: MetierSeed, v: VilleSeed, key: string): string {
  const i = pickIndex(key, 5, "h1-dec")
  const ville = v.nom
  const h1s = [
    `Assurance décennale ${m.nom} à ${ville}`,
    `Décennale BTP pour ${m.nom.toLowerCase()} — ${ville}`,
    `${ville} : votre assurance décennale ${m.nom}`,
    `Assurance responsabilité décennale (${m.nom}) à ${ville}`,
    `Devis décennale ${m.nom.toLowerCase()} à ${ville}`,
  ]
  return h1s[i]!
}

export function generateH1DoLocal(t: TypeProjetSeed, v: VilleSeed, key: string): string {
  const i = pickIndex(key, 5, "h1-do")
  const ville = v.nom
  const h1s = [
    `Assurance dommage ouvrage ${t.nom} à ${ville}`,
    `DO à ${ville} — ${t.nom}`,
    `${ville} : dommage ouvrage pour ${t.nom.toLowerCase()}`,
    `Souscrire une DO à ${ville} (${t.nom})`,
    `Devis dommage ouvrage — ${t.nom} (${ville})`,
  ]
  return h1s[i]!
}

function paragraphIntroDecennale(m: MetierSeed, v: VilleSeed, key: string): string {
  faker.seed(seedFromKey(key + "p1"))
  const ouverture = faker.helpers.arrayElement([
    "Sur la base de votre activité et du contexte local,",
    "Pour sécuriser vos chantiers et vos relations contractuelles,",
    "Si vous intervenez régulièrement sur des opérations de construction ou de rénovation lourde,",
    "Lorsque vous engagez votre responsabilité d’entreprise du bâtiment,",
    "Pour répondre aux exigences des maîtres d’ouvrage et des marchés publics ou privés,",
  ])
  return `${ouverture} l’assurance décennale ${m.nom.toLowerCase()} reste le socle de votre conformité à ${v.nom}. L’obligation est nationale ; en revanche, la réalité du terrain (accès chantier, planning, coordination) influence la manière dont vous structurez vos dossiers et vos preuves.`
}

function paragraphMilieuDecennale(m: MetierSeed, v: VilleSeed, key: string): string {
  const i = pickIndex(key, 4, "mid")
  const risque = m.risques.split(".")[0] ?? m.risques
  const blocks = [
    `Les sinistres les plus fréquemment associés à votre métier concernent notamment : ${risque.toLowerCase()}. Anticiper ces scénarios, c’est aussi sécuriser votre marge et votre réputation sur ${v.nom} et son bassin d’emploi.`,
    `À ${v.nom}, les projets peuvent combiner rénovation dense et neuf en périphérie : la décennale couvre les désordres affectant la solidité de l’ouvrage ou le rendant impropre à sa destination, dans le cadre défini par votre activité déclarée.`,
    `Nous recommandons de constituer un dossier technique propre (photos, réceptions partielles, plans) : c’est un facteur de sérénité en cas de contrôle ou de litige, indépendamment de la taille de l’agglomération.`,
    `Le coût de la prime est lié à votre chiffre d’affaires, à votre sinistralité et à la nature des travaux déclarés. Un devis en ligne permet d’obtenir une fourchette réaliste avant engagement.`,
  ]
  return blocks[i]!
}

function paragraphConversionDecennale(v: VilleSeed, key: string): string {
  const i = pickIndex(key, 3, "cta")
  const ctas = [
    `Chez ${BRAND}, le parcours devis est conçu pour les professionnels du bâtiment : vous obtenez une proposition chiffrée, puis une attestation lorsque le contrat est formalisé. Les équipes restent disponibles pour les cas atypiques (gros chantiers, reprises, sinistres passés).`,
    `Vous pouvez lancer une demande en quelques minutes : nous vous guidons sur les activités à déclarer et sur les pièces utiles pour une souscription sans allers-retours inutiles.`,
    `La conversion se joue sur la clarté : pas de promesse irréaliste — une tarification expliquée, des documents conformes, et une traçabilité utile face à vos clients et partenaires à ${v.nom}.`,
  ]
  return ctas[i]!
}

function paragraphIntroDo(t: TypeProjetSeed, v: VilleSeed, key: string): string {
  faker.seed(seedFromKey(key + "do1"))
  const intros = [
    "L’assurance dommage ouvrage protège le maître d’ouvrage contre certains dommages affectant la solidité de l’ouvrage ou le rendant impropre à sa destination.",
    "La DO est une obligation légale pour les profils concernés : elle s’inscrit en amont du chantier, avant le démarrage effectif des travaux.",
    `Chaque projet à ${v.nom} présente des spécificités (coût de construction, environnement, calendrier). Le profil « ${t.nom} » oriente la structuration du dossier et le périmètre de garantie.`,
  ]
  const intro = faker.helpers.arrayElement(intros)
  if (intro.startsWith(`Chaque projet à ${v.nom}`)) return intro
  return `${intro} Pour un projet de type « ${t.nom} » autour de ${v.nom}, l’enjeu est double : conformité et pilotage du budget aléa construction.`
}

function paragraphMilieuDo(t: TypeProjetSeed, v: VilleSeed, key: string): string {
  const i = pickIndex(key, 4, "domid")
  const txt = [
    `${t.description} À ${v.nom}, les études peuvent intégrer des contraintes locales (stationnement, délais, coordination des entreprises) qui impactent le planning, mais pas le principe de souscription.`,
    `La prime dépend notamment du coût de construction, de la surface et des garanties souscrites. Un devis personnalisé permet d’aligner la couverture sur le risque réel du projet.`,
    `Après réception des travaux, la garantie suit le régime prévu au contrat : l’objectif est de couvrir les désordres lourds relevant du périmètre légal, sans confondre avec la garantie des équipements ou le parfait achèvement.`,
    `Nous privilégions une lecture pédagogique : vous savez ce qui est attendu comme pièces, et à quel moment intervenir dans votre calendrier administratif.`,
  ]
  return txt[i]!
}

function paragraphConversionDo(v: VilleSeed, key: string): string {
  const i = pickIndex(key, 3, "docta")
  const arr = [
    `Demandez un devis ${BRAND} : réponse sous 24 h en moyenne, puis accompagnement jusqu’à la mise en place du contrat adapté à votre projet à ${v.nom}.`,
    `Le parcours en ligne limite les frictions : vous déposez les informations clés, nous revenons vers vous avec une proposition structurée.`,
    `Pour avancer sereinement, commencez par le permis de construire (si applicable), le coût estimatif et le calendrier : ces éléments accélèrent l’étude.`,
  ]
  return arr[i]!
}

/** Longueur variable : court / moyen / long */
function lengthMode(key: string): "short" | "medium" | "long" {
  const r = pickIndex(key, 3, "len")
  return r === 0 ? "short" : r === 1 ? "medium" : "long"
}

function pickKeywords(key: string, pool: string[], count: number): string[] {
  const n = Math.min(count, pool.length)
  const idx = new Set<number>()
  let salt = 0
  while (idx.size < n) {
    idx.add(pickIndex(key, pool.length, `kw${salt++}`))
  }
  return [...idx].map((i) => pool[i]!)
}

export function generateFaqDecennale(m: MetierSeed, v: VilleSeed, key: string): FaqPair[] {
  const ville = v.nom
  const base: FaqPair[] = [
    {
      q: `L’assurance décennale ${m.nom} est-elle obligatoire à ${ville} ?`,
      r: `Oui, l’obligation est nationale : elle s’applique à ${ville} comme partout en France pour les travaux couverts, dès lors que vous intervenez en tant qu’entreprise concernée par la décennale.`,
    },
    {
      q: `Quel est le prix d’une décennale pour ${m.nom.toLowerCase()} ?`,
      r: `La prime dépend surtout de votre chiffre d’affaires et de votre sinistralité. Indicativement, nos études positionnent souvent une prime annuelle autour de ${Math.round(m.prix_moyen)} € pour des profils comparables — le devis affine le montant.`,
    },
    {
      q: `Puis-je obtenir une attestation rapidement pour un chantier à ${ville} ?`,
      r: `Oui : après acceptation du tarif et formalisation du contrat, l’attestation peut être émise pour présentation au maître d’ouvrage, selon les pièces complètes.`,
    },
  ]
  const extra: FaqPair[] = [
    {
      q: `Quels risques sont les plus surveillés pour un ${m.nom.toLowerCase()} ?`,
      r: `${m.risques.split(".")[0]}.`,
    },
    {
      q: `La décennale couvre-t-elle le parfait achèvement ?`,
      r: `Non : la décennale couvre des dommages lourds au sens légal (solidité / destination). Le parfait achèvement relève d’autres mécanismes contractuels.`,
    },
  ]
  const mode = lengthMode(key)
  return mode === "short" ? base.slice(0, 2) : mode === "medium" ? [...base, extra[0]!] : [...base, ...extra]
}

export function generateFaqDo(t: TypeProjetSeed, v: VilleSeed, key: string): FaqPair[] {
  const base: FaqPair[] = [
    {
      q: `Quand souscrire une assurance dommage ouvrage à ${v.nom} ?`,
      r: `Avant le début des travaux. C’est une condition de conformité pour les maîtres d’ouvrage concernés ; le calendrier administratif doit intégrer cette étape.`,
    },
    {
      q: `Le profil « ${t.nom} » change-t-il la garantie ?`,
      r: `Il oriente l’analyse du risque et le périmètre : ${t.description}`,
    },
    {
      q: `Combien de temps dure la protection ?`,
      r: `La garantie suit le régime légal applicable au contrat, avec une logique de couverture dans le temps liée à la réception et aux désordres couverts.`,
    },
  ]
  const mode = lengthMode(key)
  if (mode === "short") return base.slice(0, 2)
  return [
    ...base,
    {
      q: `Quels documents sont utiles pour un devis à ${v.nom} ?`,
      r: `Permis de construire (si applicable), coût de construction estimatif, surface, planning prévisionnel : ces éléments accélèrent une proposition fiable.`,
    },
  ]
}

function faqToText(faq: FaqPair[]): string {
  return faq.map((f, i) => `Q${i + 1}. ${f.q}\nR${i + 1}. ${f.r}`).join("\n\n")
}

export function hashContentPayload(parts: string[]): string {
  return createHash("sha256").update(parts.join("\n---\n"), "utf8").digest("hex")
}

/**
 * API unifiée (titres / meta / contenu) pour imports externes.
 */
export function generateTitle(
  kind: "decennale" | "do",
  profil: MetierSeed | TypeProjetSeed,
  ville: VilleSeed,
  key: string
): string {
  if (kind === "decennale") {
    return generateTitleDecennaleLocal(profil as MetierSeed, ville, key)
  }
  return generateTitleDoLocal(profil as TypeProjetSeed, ville, key)
}

export function generateMeta(
  kind: "decennale" | "do",
  profil: MetierSeed | TypeProjetSeed,
  ville: VilleSeed,
  key: string
): string {
  if (kind === "decennale") {
    return generateMetaDecennaleLocal(profil as MetierSeed, ville, key)
  }
  return generateMetaDoLocal(profil as TypeProjetSeed, ville, key)
}

export function generateContent(
  kind: "decennale" | "do",
  profil: MetierSeed | TypeProjetSeed,
  ville: VilleSeed,
  key: string
): GeneratedPage {
  if (kind === "decennale") {
    return generateContentDecennaleLocal(profil as MetierSeed, ville, key)
  }
  return generateContentDoLocal(profil as TypeProjetSeed, ville, key)
}

/** Corps principal + mots-clés secondaires intégrés naturellement */
export function generateContentDecennaleLocal(m: MetierSeed, v: VilleSeed, key: string): GeneratedPage {
  const slug = `decennale-local:${m.slug}:${v.slug}`
  const kw = pickKeywords(key, KW_DECENNALE, pickIndex(key, 3, "nkw") + 3)
  const faq = generateFaqDecennale(m, v, key)
  const title = generateTitleDecennaleLocal(m, v, key)
  const meta = generateMetaDecennaleLocal(m, v, key)
  const h1 = generateH1DecennaleLocal(m, v, key)
  const mode = lengthMode(key)

  const p1 = paragraphIntroDecennale(m, v, key)
  const p2 = paragraphMilieuDecennale(m, v, key)
  const p3 = paragraphConversionDecennale(v, key)
  const kwLine = `Mots-clés utiles : ${kw.join(", ")}.`

  let body = `${p1}\n\n${p2}\n\n${p3}`
  if (mode === "long") {
    body += `\n\n${kwLine}\n\n${m.description}`
  } else if (mode === "medium") {
    body += `\n\n${kwLine}`
  }

  const contenu =
    body +
    `\n\n--- FAQ ---\n` +
    faqToText(faq) +
    `\n\n--- CTA ---\nDemandez un devis décennale en ligne (page /devis — réf. ville : ${v.slug}).`

  const content_hash = hashContentPayload([slug, title, meta, h1, body, faqToText(faq)])

  return {
    slug,
    type_page: "decennale_local",
    title,
    meta_description: meta,
    h1,
    body_main: body,
    contenu,
    faq,
    content_hash,
    keywords_secondaires: kw,
  }
}

export function generateContentDoLocal(t: TypeProjetSeed, v: VilleSeed, key: string): GeneratedPage {
  const slug = `do-local:${t.slug}:${v.slug}`
  const kw = pickKeywords(key, KW_DO, pickIndex(key, 3, "nkw2") + 3)
  const faq = generateFaqDo(t, v, key)
  const title = generateTitleDoLocal(t, v, key)
  const meta = generateMetaDoLocal(t, v, key)
  const h1 = generateH1DoLocal(t, v, key)
  const mode = lengthMode(key)

  const p1 = paragraphIntroDo(t, v, key)
  const p2 = paragraphMilieuDo(t, v, key)
  const p3 = paragraphConversionDo(v, key)
  const kwLine = `Lexique utile : ${kw.join(", ")}.`

  let body = `${p1}\n\n${p2}\n\n${p3}`
  if (mode === "long") {
    body += `\n\n${kwLine}\n\n${t.description}`
  } else if (mode === "medium") {
    body += `\n\n${kwLine}`
  }

  const contenu =
    body +
    `\n\n--- FAQ ---\n` +
    faqToText(faq) +
    `\n\n--- CTA ---\nDemandez un devis dommage ouvrage (page /devis-dommage-ouvrage — contexte : ${v.slug}).`

  const content_hash = hashContentPayload([slug, title, meta, h1, body, faqToText(faq)])

  return {
    slug,
    type_page: "do_local",
    title,
    meta_description: meta,
    h1,
    body_main: body,
    contenu,
    faq,
    content_hash,
    keywords_secondaires: kw,
  }
}
