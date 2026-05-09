import type { InternalLink } from "@/lib/seo-programmatic/types"

type LocalProfile = {
  label: string
  nearby: string[]
  constructionContext: string
  riskContext: string
}

const DEFAULT_LOCAL_PROFILE: LocalProfile = {
  label: "secteur local",
  nearby: ["communes voisines", "agglomération", "périphérie"],
  constructionContext:
    "Les chantiers combinent souvent rénovation, extension et construction neuve selon la densité urbaine et le foncier disponible.",
  riskContext:
    "L’enjeu principal reste de déclarer précisément les travaux réalisés, le chiffre d’affaires et les éventuelles contraintes techniques du chantier.",
}

const LOCAL_PROFILES: Record<string, LocalProfile> = {
  paris: {
    label: "Paris et petite couronne",
    nearby: ["Boulogne-Billancourt", "Montreuil", "Saint-Denis", "Nanterre", "Créteil"],
    constructionContext:
      "À Paris, les interventions concernent souvent la rénovation d’immeubles anciens, les contraintes de copropriété, les accès chantier restreints et les travaux en site occupé.",
    riskContext:
      "Les maîtres d’ouvrage demandent fréquemment une attestation claire avant devis ou démarrage, notamment pour les lots techniques, toiture, structure et second œuvre en immeuble collectif.",
  },
  lyon: {
    label: "Lyon et métropole lyonnaise",
    nearby: ["Villeurbanne", "Vénissieux", "Caluire-et-Cuire", "Bron", "Oullins"],
    constructionContext:
      "Dans la métropole lyonnaise, les dossiers mêlent rénovation urbaine, logements collectifs, maisons en périphérie et locaux professionnels.",
    riskContext:
      "La cohérence entre activités déclarées, chiffre d’affaires et attestations remises aux clients est déterminante pour éviter un refus de chantier ou une exclusion.",
  },
  marseille: {
    label: "Marseille et littoral provençal",
    nearby: ["Aix-en-Provence", "Aubagne", "La Ciotat", "Vitrolles", "Marignane"],
    constructionContext:
      "À Marseille, les chantiers peuvent intégrer contraintes de pente, exposition au vent, proximité littorale et rénovation de bâtis hétérogènes.",
    riskContext:
      "Les travaux d’enveloppe, d’étanchéité, de structure et d’aménagement extérieur doivent être décrits précisément dans le dossier d’assurance.",
  },
  toulouse: {
    label: "Toulouse et Haute-Garonne",
    nearby: ["Blagnac", "Colomiers", "Tournefeuille", "Muret", "Balma"],
    constructionContext:
      "Autour de Toulouse, les projets alternent maisons individuelles, extensions, locaux tertiaires et rénovations liées à la croissance de l’agglomération.",
    riskContext:
      "La déclaration des lots réellement exécutés et des sous-traitances éventuelles facilite l’émission d’une attestation exploitable par les donneurs d’ordre.",
  },
  bordeaux: {
    label: "Bordeaux et Gironde",
    nearby: ["Mérignac", "Pessac", "Talence", "Bègles", "Cenon"],
    constructionContext:
      "À Bordeaux, la rénovation de bâtiments existants, les échoppes, extensions et opérations en zone urbaine dense créent des contraintes de chantier spécifiques.",
    riskContext:
      "Les activités touchant à la structure, l’humidité, l’étanchéité ou les réseaux doivent être cadrées avec soin dans le devis et l’attestation.",
  },
  lille: {
    label: "Lille et métropole européenne",
    nearby: ["Roubaix", "Tourcoing", "Villeneuve-d’Ascq", "Marcq-en-Barœul", "La Madeleine"],
    constructionContext:
      "Dans la métropole lilloise, les chantiers concernent souvent maisons de ville, locaux professionnels, rénovations énergétiques et bâtiments mitoyens.",
    riskContext:
      "Les risques liés à l’humidité, aux interfaces entre lots et aux travaux en mitoyenneté nécessitent une description précise des activités assurées.",
  },
}

function getLocalProfile(villeSlug: string): LocalProfile {
  return LOCAL_PROFILES[villeSlug] ?? DEFAULT_LOCAL_PROFILE
}

function nearbySentence(profile: LocalProfile): string {
  return profile.nearby.length
    ? `Secteurs proches souvent concernés : ${profile.nearby.join(", ")}.`
    : ""
}

export function buildDecennaleLocalEnrichment(input: {
  metierNom: string
  villeNom: string
  villeSlug: string
  riskFocus?: string
  preparationHint?: string
}): { context: string[]; checklist: string[]; links: InternalLink[] } {
  const profile = getLocalProfile(input.villeSlug)
  const metier = input.metierNom.toLowerCase()
  return {
    context: [
      `${profile.constructionContext} Pour un professionnel ${metier} à ${input.villeNom}, l’assurance décennale doit correspondre aux travaux réellement réalisés et aux chantiers acceptés.`,
      `${profile.riskContext} ${input.riskFocus ? `Point de vigilance métier : ${input.riskFocus}.` : ""}`.trim(),
      nearbySentence(profile),
    ].filter(Boolean),
    checklist: [
      "SIRET et raison sociale à jour",
      "Activités exactes réalisées sur chantier",
      "Chiffre d’affaires annuel déclaré",
      input.preparationHint || "Exclusions, sous-traitance et antécédents à signaler avant émission de l’attestation",
    ],
    links: [
      { href: `/devis?from=seo-local-${input.villeSlug}`, label: `Devis décennale ${input.metierNom}` },
      { href: `/dommage-ouvrage/particulier/${input.villeSlug}`, label: `Dommage ouvrage à ${input.villeNom}` },
      { href: "/guides/obligation-decennale", label: "Guide obligation décennale" },
    ],
  }
}

export function buildDoLocalEnrichment(input: {
  profilNom: string
  villeNom: string
  villeSlug: string
}): { context: string[]; checklist: string[]; links: InternalLink[] } {
  const profile = getLocalProfile(input.villeSlug)
  return {
    context: [
      `${profile.constructionContext} Pour un projet ${input.profilNom.toLowerCase()} à ${input.villeNom}, le dossier DO doit surtout documenter le coût, la nature de l’ouvrage, les intervenants et les pièces techniques disponibles.`,
      "La dommage ouvrage reste une obligation nationale : le contexte local joue surtout sur l’analyse technique, le coût de construction et les justificatifs demandés.",
      nearbySentence(profile),
    ].filter(Boolean),
    checklist: [
      "Permis de construire ou autorisation équivalente",
      "Montant des travaux et lots concernés",
      "Plans, étude de sol, contrôle technique ou conventions disponibles",
      "Choix entre DO complète et garantie clos/couvert lorsque le dossier s’y prête",
    ],
    links: [
      { href: `/devis-dommage-ouvrage?from=seo-local-${input.villeSlug}`, label: "Demander un devis DO" },
      { href: `/assurance-decennale/macon/${input.villeSlug}`, label: `Décennale maçon à ${input.villeNom}` },
      { href: "/guides/obligation-dommage-ouvrage", label: "Guide obligation DO" },
    ],
  }
}
