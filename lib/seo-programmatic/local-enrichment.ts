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
  nice: {
    label: "Nice et Côte d'Azur",
    nearby: ["Antibes", "Cannes", "Cagnes-sur-Mer", "Grasse", "Menton"],
    constructionContext:
      "Sur la Côte d'Azur, les chantiers se heurtent souvent à des contraintes de terrain en restanques ou forte pente, à l'exposition au sel marin et au vent, ainsi qu'aux rénovations de villas et copropriétés d'architecture belle époque ou contemporaine.",
    riskContext:
      "L'accent est mis sur les travaux d'étanchéité de toiture-terrasse, de cuvelage, de maçonnerie de soutènement et de menuiseries extérieures résistantes aux intempéries marines.",
  },
  nantes: {
    label: "Nantes et Loire-Atlantique",
    nearby: ["Saint-Herblain", "Rezé", "Orvault", "Vertou", "Carquefou"],
    constructionContext:
      "Dans l'agglomération nantaise, le dynamisme démographique génère de nombreux chantiers neufs en écoquartiers ainsi que des réhabilitations d'immeubles de centre-ville et de maisons individuelles.",
    riskContext:
      "Les sols humides du bassin de la Loire et les exigences de performance thermique imposent une rigueur particulière sur le terrassement, le drainage, l'isolation et la pose des réseaux.",
  },
  montpellier: {
    label: "Montpellier et Hérault",
    nearby: ["Castelnau-le-Lez", "Lattes", "Mauguio", "Saint-Jean-de-Védas", "Juvignac"],
    constructionContext:
      "À Montpellier, l'urbanisation rapide entraîne d'importants programmes neufs, des extensions pavillonnaires et des chantiers soumis à de fortes chaleurs estivales et à des épisodes cévenols violents.",
    riskContext:
      "La gestion des eaux pluviales, la protection des façades contre les chocs thermiques et l'étanchéité des toitures constituent des points de vigilance décennale capitaux.",
  },
  strasbourg: {
    label: "Strasbourg et Eurométropole",
    nearby: ["Schiltigheim", "Illkirch-Graffenstaden", "Lingolsheim", "Bischheim", "Ostwald"],
    constructionContext:
      "À Strasbourg, les artisans interviennent sur un bâti traditionnel alsacien (colombages, tuiles plates) aussi bien que sur des immeubles contemporains et des opérations de rénovation énergétique globale.",
    riskContext:
      "Le climat continental aux hivers rigoureux et la présence d'une nappe phréatique affleurante nécessitent un soin strict sur l'isolation thermique extérieure, la couverture et l'étanchéité des sous-sols.",
  },
  rennes: {
    label: "Rennes et Ille-et-Vilaine",
    nearby: ["Cesson-Sévigné", "Saint-Jacques-de-la-Lande", "Betton", "Chantepie", "Pacé"],
    constructionContext:
      "Dans le bassin rennais, la forte construction neuve côtoie la réhabilitation de maisons en schiste ou en pans de bois et la densification urbaine près des axes de transport.",
    riskContext:
      "Les interfaces de second œuvre, la charpente, la couverture ardoise et la conformité des installations électriques et thermiques sont fréquemment vérifiées par les maîtres d'ouvrage.",
  },
  reims: {
    label: "Reims et Grand Est",
    nearby: ["Tinqueux", "Bétheny", "Cormontreuil", "Saint-Brice-Courcelles", "Épernay"],
    constructionContext:
      "Dans le secteur rémois, les chantiers concernent la réfection d'immeubles Art déco et en pierre calcaire, les extensions de pavillons et la construction de hangars ou bâtiments tertiaires et viticoles.",
    riskContext:
      "La sensibilité des sols crayeux à l'humidité et les amplitudes thermiques saisonnières imposent des garanties solides en fondations, maçonnerie, ravalement et toiture.",
  },
  "saint-etienne": {
    label: "Saint-Étienne et Loire",
    nearby: ["Saint-Chamond", "Firminy", "Rive-de-Gier", "Le Chambon-Feugerolles", "Roche-la-Molière"],
    constructionContext:
      "Dans le bassin stéphanois, la reconversion urbaine et la topographie vallonnée imposent des chantiers techniques de rénovation thermique, d'accès escarpés et de reprise d'immeubles anciens.",
    riskContext:
      "L'historique des terrains et la rigueur hivernale du relief exigent un contrôle rigoureux des fondations, de la stabilité des maçonneries et de l'isolation de toiture.",
  },
  "le-havre": {
    label: "Le Havre et estuaire de la Seine",
    nearby: ["Montivilliers", "Gonfreville-l'Orcher", "Harfleur", "Sainte-Adresse", "Octeville-sur-Mer"],
    constructionContext:
      "Au Havre, la reconstruction en béton armé Perret classée à l'UNESCO et le climat maritime de la Manche structurent les chantiers de rénovation, de ravalement et d'aménagement.",
    riskContext:
      "L'exposition aux embruns, aux fortes pluies battantes et au vent marin rend critiques les garanties sur les enduits d'imperméabilité de façade, les menuiseries et l'étanchéité.",
  },
  grenoble: {
    label: "Grenoble et vallée alpine",
    nearby: ["Échirolles", "Saint-Martin-d'Hères", "Fontaine", "Meylan", "Voiron"],
    constructionContext:
      "Dans l'agglomération grenobloise, la cuvette alpine impose des exigences parasismiques accrues et de fortes variations de température entre été caniculaire et hiver alpin.",
    riskContext:
      "Les normes parasismiques sur les structures, l'isolation thermique performante et l'étanchéité des toitures plates ou en pente constituent les critères essentiels pour les assureurs et les maîtres d'ouvrage.",
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
      { href: "/guides/que-couvre-assurance-decennale", label: "Que couvre la décennale" },
      { href: "/guides/fin-assurance-decennale-qbe-2027", label: "Reprise décennale après QBE" },
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
      { href: "/guides/quand-souscrire-dommage-ouvrage", label: "Quand souscrire la dommage ouvrage" },
    ],
  }
}
