/**
 * Correspondance entre les activités du site et la nomenclature FFSA/France Assureurs 2019
 * Référence : Nomenclature des activités du BTP (France Assureurs, ex-FFSA)
 * PDF : https://www.index-habitation.fr/documents/nomenclature-activites-btp-2019.pdf
 *
 * Structure de la nomenclature :
 * 1. Préparation et aménagement du site (1.1 à 1.11)
 * 2. Structure et gros œuvre (2.1 à 2.6)
 * 3. Clos et couvert (3.1 à 3.10)
 * 4. Divisions - Aménagements - Finitions (4.1 à 4.12)
 * 5. Lots techniques et activités spécifiques (5.1 à 5.11)
 *
 * Les professions intellectuelles (Architecte, BET, etc.) ont une nomenclature séparée
 * (voir Decenalia, CEA Assurances, etc.)
 */

export interface NomenclatureItem {
  /** Code FFSA (ex: 2.2, 5.1) */
  code: string
  /** Libellé officiel dans la nomenclature */
  libelleOfficiel: string
  /** Catégorie principale */
  categorie: "preparation" | "structure" | "clos-couvert" | "divisions" | "lots-techniques" | "professions-intellectuelles"
  /** Exclusions (nomenclature FFSA, Code civil, usages assureurs) — termes techniques du site */
  exclusions?: string[]
}

/** Exclusions légales communes (art. A243-1 Code des assurances, Loi Spinetta) — opposables au tiers */
export const EXCLUSIONS_LEGALES_COMMUNES = [
  "Fait intentionnel ou dol du souscripteur ou de l'assuré",
  "Usure normale, défaut d'entretien ou usage anormal",
  "Cause étrangère : faits de guerre, terrorisme, sabotage",
  "Cause étrangère : phénomènes naturels catastrophiques (cyclone, inondation, séisme)",
  "Cause étrangère : incendie ou explosion (sauf si conséquence d'un défaut de l'ouvrage)",
] as const

/** Déchéance (non opposable au tiers) — inobservation inexcusable des règles de l'art */
export const DECHANCE_REGLE_ART = "Déchéance pour inobservation inexcusable des règles de l'art (annexe I de l'article A.243-1 du Code des assurances). Elle n'est pas opposable aux bénéficiaires des indemnités."

/** Ouvrages exclus de la garantie décennale obligatoire (art. L.243-1-1 Code des assurances) */
export const OUVRAGES_EXCLUS_DECENNALE = [
  "Ouvrages maritimes, fluviaux, lacustres",
  "Ouvrages portuaires, aéroportuaires, héliportuaires",
  "Infrastructures routières et ferroviaires",
  "Ouvrages de traitement des résidus urbains et déchets industriels",
  "Ouvrages de transport, stockage, production et distribution d'énergie",
  "Ouvrages de télécommunications",
  "Ouvrages sportifs (sauf si couverts par assurance spécifique)",
] as const

/** Correspondance : activité du site → codes nomenclature FFSA */
export const ACTIVITE_TO_NOMENCLATURE: Record<string, NomenclatureItem[]> = {
  // Gros œuvre / Structure
  Maçonnerie: [
    { code: "2.2", libelleOfficiel: "Maçonnerie et béton armé", categorie: "structure" },
  ],
  "Gros œuvre": [
    { code: "2.1", libelleOfficiel: "Fondations et parois spéciales", categorie: "structure" },
    { code: "2.2", libelleOfficiel: "Maçonnerie et béton armé", categorie: "structure" },
    { code: "2.3", libelleOfficiel: "Béton précontraint in situ", categorie: "structure" },
  ],
  Charpente: [
    { code: "2.4", libelleOfficiel: "Charpente et structure en bois", categorie: "structure" },
    { code: "2.5", libelleOfficiel: "Constructions à ossature bois", categorie: "structure" },
    { code: "2.6", libelleOfficiel: "Charpente et structure métallique", categorie: "structure" },
  ],
  Couverture: [
    { code: "3.1", libelleOfficiel: "Couverture", categorie: "clos-couvert" },
  ],
  Démolition: [
    { code: "1.1", libelleOfficiel: "Démolition sans utilisation d'explosifs", categorie: "preparation" },
    { code: "1.2", libelleOfficiel: "Démolition avec utilisation d'explosifs", categorie: "preparation" },
  ],
  Terrassement: [
    { code: "1.3", libelleOfficiel: "Terrassement", categorie: "preparation" },
  ],
  Fondations: [
    { code: "2.1", libelleOfficiel: "Fondations et parois spéciales", categorie: "structure" },
    { code: "2.2", libelleOfficiel: "Maçonnerie et béton armé (fondations superficielles)", categorie: "structure" },
  ],
  "Fondations spéciales": [
    { code: "2.1", libelleOfficiel: "Fondations et parois spéciales", categorie: "structure" },
  ],
  Béton: [
    { code: "2.2", libelleOfficiel: "Maçonnerie et béton armé", categorie: "structure" },
    { code: "2.3", libelleOfficiel: "Béton précontraint in situ", categorie: "structure" },
  ],
  "Ouvrage d'art": [
    { code: "2.1", libelleOfficiel: "Fondations et parois spéciales", categorie: "structure" },
    { code: "2.2", libelleOfficiel: "Maçonnerie et béton armé", categorie: "structure" },
    { code: "1.6", libelleOfficiel: "Voiries Réseaux Divers (V.R.D.)", categorie: "preparation" },
  ],

  // Second œuvre
  Plomberie: [
    { code: "5.1", libelleOfficiel: "Plomberie", categorie: "lots-techniques" },
  ],
  Chauffage: [
    { code: "5.2", libelleOfficiel: "Chauffages et installations thermiques", categorie: "lots-techniques" },
  ],
  Climatisation: [
    { code: "5.4", libelleOfficiel: "Installations d'aéraulique, de climatisation et de conditionnement d'air", categorie: "lots-techniques" },
  ],
  Électricité: [
    { code: "5.5", libelleOfficiel: "Electricité - Télécommunications", categorie: "lots-techniques" },
  ],
  Carrelage: [
    { code: "4.9", libelleOfficiel: "Revêtement de surfaces en matériaux durs - Chapes et sols coulés", categorie: "divisions" },
  ],
  Peinture: [
    { code: "4.7", libelleOfficiel: "Peinture", categorie: "divisions" },
  ],
  Menuiserie: [
    { code: "4.1", libelleOfficiel: "Menuiseries intérieures", categorie: "divisions" },
    { code: "3.9", libelleOfficiel: "Menuiseries extérieures", categorie: "clos-couvert" },
  ],
  Plâtrerie: [
    { code: "4.4", libelleOfficiel: "Plâtrerie - Staff - Stuc - Gypserie", categorie: "divisions" },
  ],
  Parquet: [
    { code: "4.8", libelleOfficiel: "Revêtement intérieur de surfaces en matériaux souples et parquets", categorie: "divisions" },
  ],
  Étanchéité: [
    { code: "3.2", libelleOfficiel: "Etanchéité de toiture, terrasse et plancher intérieur", categorie: "clos-couvert" },
    { code: "3.3", libelleOfficiel: "Etanchéité et imperméabilisation de cuvelages, réservoirs et piscines", categorie: "clos-couvert" },
  ],
  Façade: [
    { code: "3.4", libelleOfficiel: "Revêtements de façades par enduits, ravalements", categorie: "clos-couvert" },
    { code: "3.5", libelleOfficiel: "Isolation thermique par l'extérieur", categorie: "clos-couvert" },
    { code: "3.6", libelleOfficiel: "Bardages de façade", categorie: "clos-couvert" },
    { code: "3.7", libelleOfficiel: "Façades-Rideaux", categorie: "clos-couvert" },
  ],
  Isolation: [
    { code: "4.11", libelleOfficiel: "Isolation intérieure thermique - Acoustique", categorie: "divisions" },
    { code: "4.12", libelleOfficiel: "Isolation frigorifique", categorie: "divisions" },
    { code: "3.5", libelleOfficiel: "Isolation thermique par l'extérieur", categorie: "clos-couvert" },
  ],
  "Assèchement des murs": [
    { code: "1.11", libelleOfficiel: "Assèchement des murs", categorie: "preparation" },
  ],
  Serrurerie: [
    { code: "4.5", libelleOfficiel: "Serrurerie - Métallerie", categorie: "divisions" },
  ],
  Vitrerie: [
    { code: "4.6", libelleOfficiel: "Vitrerie - Miroiterie", categorie: "divisions" },
  ],

  // Spécialités
  Ascenseurs: [
    { code: "5.6", libelleOfficiel: "Ascenseurs", categorie: "lots-techniques" },
  ],
  "Électricité spéciale": [
    { code: "5.5", libelleOfficiel: "Electricité - Télécommunications", categorie: "lots-techniques" },
  ],
  "Réseaux secs": [
    { code: "5.5", libelleOfficiel: "Electricité - Télécommunications (réseaux)", categorie: "lots-techniques" },
    { code: "1.6", libelleOfficiel: "Voiries Réseaux Divers (V.R.D.)", categorie: "preparation" },
  ],
  Assainissement: [
    { code: "1.6", libelleOfficiel: "Voiries Réseaux Divers (V.R.D.) - Assainissement", categorie: "preparation" },
    { code: "5.1", libelleOfficiel: "Plomberie (évacuation)", categorie: "lots-techniques" },
  ],
  "Travaux publics": [
    { code: "1.3", libelleOfficiel: "Terrassement", categorie: "preparation" },
    { code: "1.6", libelleOfficiel: "Voiries Réseaux Divers (V.R.D.)", categorie: "preparation" },
    { code: "2.1", libelleOfficiel: "Fondations et parois spéciales", categorie: "structure" },
  ],
  "Pose de revêtements": [
    { code: "4.8", libelleOfficiel: "Revêtement intérieur de surfaces en matériaux souples et parquets", categorie: "divisions" },
    { code: "4.9", libelleOfficiel: "Revêtement de surfaces en matériaux durs - Chapes et sols coulés", categorie: "divisions" },
  ],
  Métallerie: [
    { code: "4.5", libelleOfficiel: "Serrurerie - Métallerie", categorie: "divisions" },
    { code: "2.6", libelleOfficiel: "Charpente et structure métallique", categorie: "structure" },
  ],
  "Peinture en bâtiment": [
    { code: "4.7", libelleOfficiel: "Peinture", categorie: "divisions" },
    { code: "3.4", libelleOfficiel: "Revêtements de façades par enduits, ravalements", categorie: "clos-couvert" },
  ],
  Ravalement: [
    { code: "3.4", libelleOfficiel: "Revêtements de façades par enduits, avec ou sans fonction d'imperméabilité et/ou d'étanchéité, ravalements", categorie: "clos-couvert" },
  ],
  "Étanchéité toiture": [
    { code: "3.2", libelleOfficiel: "Etanchéité de toiture, terrasse et plancher intérieur", categorie: "clos-couvert" },
  ],
  "Nettoyage toiture": [
    { code: "3.1", libelleOfficiel: "Couverture (entretien)", categorie: "clos-couvert" },
    { code: "3.4", libelleOfficiel: "Revêtements de façades - nettoyage, sablage, grenaillage", categorie: "clos-couvert" },
  ],
  "Nettoyage toiture et peinture résine (I3 à I5)": [
    { code: "3.4", libelleOfficiel: "Protection et réfection des façades par revêtement d'imperméabilité à base de polymères de classe I1, I2, I3, et systèmes d'étanchéité à base de polymère de classe I4", categorie: "clos-couvert" },
  ],

  // Professions intellectuelles du bâtiment (nomenclature séparée - Decenalia / assureurs)
  Architecte: [
    { code: "PI-ARCH", libelleOfficiel: "Maîtrise d'œuvre de conception et de réalisation", categorie: "professions-intellectuelles" },
  ],
  "Architecte intérieur": [
    {
      code: "PI-ARCH-INT",
      libelleOfficiel: "Architecte d'intérieur (conception et aménagement intérieur)",
      categorie: "professions-intellectuelles",
    },
  ],
  "Maître d'œuvre": [
    { code: "PI-MOE", libelleOfficiel: "Maîtrise d'œuvre de conception et de réalisation", categorie: "professions-intellectuelles" },
  ],
  "Économiste de la construction": [
    { code: "PI-ECON", libelleOfficiel: "Économiste de la construction", categorie: "professions-intellectuelles" },
  ],
  Métreur: [
    { code: "PI-METRE", libelleOfficiel: "Métré-vérification", categorie: "professions-intellectuelles" },
  ],
  "Coordinateur SPS": [
    { code: "PI-SPS", libelleOfficiel: "Coordination SPS", categorie: "professions-intellectuelles" },
  ],
  "Diagnostiqueur immobilier": [
    { code: "PI-DIAG", libelleOfficiel: "Diagnostic techniques règlementaires hors amiante", categorie: "professions-intellectuelles" },
  ],
  Géomètre: [
    { code: "PI-GEO", libelleOfficiel: "Géomètre Topographe", categorie: "professions-intellectuelles" },
  ],
  "Expert en construction": [
    { code: "PI-EXP", libelleOfficiel: "Expertise amiable et/ou arbitrage", categorie: "professions-intellectuelles" },
  ],
  "Ingénieur structure": [
    { code: "PI-BET-STR", libelleOfficiel: "BET structure, clos, couverts", categorie: "professions-intellectuelles" },
  ],
  "Ingénieur fluides": [
    { code: "PI-BET-FLU", libelleOfficiel: "BET Fluides, CVC, électricité, plomberie, génie climatique", categorie: "professions-intellectuelles" },
  ],
  "Conducteur de travaux": [
    { code: "PI-OPC", libelleOfficiel: "Ordonnancement, Pilotage, Coordination", categorie: "professions-intellectuelles" },
  ],
  "Bureau de contrôle technique": [
    { code: "PI-BET", libelleOfficiel: "BET Tous corps d'état / Vérification conformité", categorie: "professions-intellectuelles" },
  ],

  // BET
  "BET structure": [
    { code: "PI-BET-STR", libelleOfficiel: "BET structure, clos, couverts (Maçonnerie, béton armé, charpente bois, charpente métallique, étanchéité)", categorie: "professions-intellectuelles" },
  ],
  "BET fluides": [
    { code: "PI-BET-FLU", libelleOfficiel: "BET Fluides, CVCD, électricité, plomberie, génie climatique", categorie: "professions-intellectuelles" },
  ],
  "BET thermique": [
    { code: "PI-BET-FLU", libelleOfficiel: "BET Fluides, CVCD, électricité, plomberie, génie climatique", categorie: "professions-intellectuelles" },
  ],
  "BET géotechnique": [
    { code: "PI-BET-GEO", libelleOfficiel: "Étude géotechnique G1, G2, G3, G4 / Diagnostic géotechnique G5", categorie: "professions-intellectuelles" },
  ],
  "BET acoustique": [
    { code: "PI-BET-ACOU", libelleOfficiel: "BET isolation acoustique", categorie: "professions-intellectuelles" },
  ],
  "BET électricité": [
    { code: "PI-BET-ELEC", libelleOfficiel: "BET Électricité", categorie: "professions-intellectuelles" },
  ],
  "BET VRD": [
    { code: "PI-BET-VRD", libelleOfficiel: "BET VRD, terrassement", categorie: "professions-intellectuelles" },
  ],
  "BET façades": [
    { code: "PI-BET-FAC", libelleOfficiel: "BET Facades", categorie: "professions-intellectuelles" },
  ],
  "BET béton armé": [
    { code: "PI-BET-STR", libelleOfficiel: "BET structure, clos, couverts", categorie: "professions-intellectuelles" },
  ],
  "BET charpente métallique": [
    { code: "PI-BET-STR", libelleOfficiel: "BET structure, clos, couverts", categorie: "professions-intellectuelles" },
  ],
  "BET bois": [
    { code: "PI-BET-STR", libelleOfficiel: "BET structure, clos, couverts", categorie: "professions-intellectuelles" },
  ],
  "BET fluides spéciaux": [
    { code: "PI-BET-FLU", libelleOfficiel: "BET Fluides, CVCD, électricité, plomberie, génie climatique", categorie: "professions-intellectuelles" },
  ],
  "BET environnement": [
    { code: "PI-BET-CES", libelleOfficiel: "BET Corps d'état secondaires", categorie: "professions-intellectuelles" },
  ],
  "BET sécurité incendie": [
    { code: "PI-MOE-SSI", libelleOfficiel: "Maîtrise d'œuvre et coordination de SSI", categorie: "professions-intellectuelles" },
  ],
  "BET CVC": [
    { code: "PI-BET-FLU", libelleOfficiel: "BET Fluides, CVCD, électricité, plomberie, génie climatique", categorie: "professions-intellectuelles" },
  ],
  "BET assainissement": [
    { code: "PI-BET-VRD", libelleOfficiel: "BET VRD, terrassement", categorie: "professions-intellectuelles" },
  ],
  "BET coordination": [
    { code: "PI-OPC", libelleOfficiel: "Ordonnancement, Pilotage, Coordination", categorie: "professions-intellectuelles" },
  ],
  "BET économie de la construction": [
    { code: "PI-ECON", libelleOfficiel: "Économiste de la construction", categorie: "professions-intellectuelles" },
  ],
  "BET structure métallique": [
    { code: "PI-BET-STR", libelleOfficiel: "BET structure, clos, couverts", categorie: "professions-intellectuelles" },
  ],
  "BET géomètre": [
    { code: "PI-GEO", libelleOfficiel: "Géomètre Topographe", categorie: "professions-intellectuelles" },
  ],
}

/** Libellés des catégories */
export const CATEGORIE_LABELS: Record<string, string> = {
  preparation: "1. Préparation et aménagement du site",
  structure: "2. Structure et gros œuvre",
  "clos-couvert": "3. Clos et couvert",
  divisions: "4. Divisions - Aménagements - Finitions",
  "lots-techniques": "5. Lots techniques et activités spécifiques",
  "professions-intellectuelles": "Professions intellectuelles du bâtiment",
}

/** Retourne les codes nomenclature pour une activité du site */
export function getNomenclatureForActivite(activite: string): NomenclatureItem[] {
  return ACTIVITE_TO_NOMENCLATURE[activite] ?? []
}

/** Exclusions par activité — « ne sont pas compris » de la nomenclature France Assureurs 2019, rédigées pour le site. */
export const ACTIVITE_EXCLUSIONS: Record<string, string[]> = {
  Maçonnerie: [
    "Parois de soutènement structurellement autonomes de plus de 2,5 m",
    "Revêtement mural agrafé, attaché ou collé",
    "Four et cheminée industriels",
    "Béton précontraint mis en tension sur le chantier",
    "Charpente préfabriquée dans l'industrie",
  ],
  "Gros œuvre": [
    "Parois de soutènement structurellement autonomes de plus de 2,5 m",
    "Béton précontraint mis en tension sur le chantier",
    "Charpente préfabriquée dans l'industrie",
    "Fondations spéciales : pieux, micropieux et parois moulées",
  ],
  Charpente: ["Façades-rideaux", "Étanchéité de toiture-terrasse", "Couverture en marché de travaux distinct"],
  Couverture: [
    "Couvertures textiles",
    "Étanchéité de toitures-terrasses",
    "Installation électrique ou thermique des capteurs solaires",
  ],
  Démolition: ["Utilisation d'explosifs", "Désamiantage", "Comblement de carrières"],
  Terrassement: ["Comblement des carrières", "Pieux, micropieux et parois moulées", "Infrastructures routières et ferroviaires"],
  Fondations: ["Parois de soutènement structurellement autonomes de plus de 2,5 m", "Béton précontraint in situ"],
  "Fondations spéciales": [
    "Fondations superficielles courantes",
    "Maçonnerie et béton armé en élévation",
    "Amélioration des sols hors pieux, micropieux et parois moulées",
  ],
  Béton: ["Béton précontraint mis en tension sur le chantier", "Fours et cheminées industriels", "Fondations spéciales"],
  "Ouvrage d'art": [
    "Ouvrages maritimes, fluviaux et lacustres",
    "Infrastructures routières et ferroviaires",
    "Ouvrages de traitement des déchets",
    "Ouvrages de télécommunications et de distribution d'énergie",
  ],
  Plomberie: [
    "Installations d'appareils de production de chauffage",
    "Installations de géothermie",
    "Pose de capteurs solaires intégrés",
  ],
  Chauffage: [
    "Système de captage géothermique",
    "Pose de capteurs solaires intégrés",
    "Réalisation d'inserts et cheminées",
    "Fours et cheminées industriels",
  ],
  Climatisation: [
    "Système de captage géothermique",
    "Pose de capteurs solaires intégrés",
    "Isolation frigorifique",
  ],
  Électricité: ["Pose de capteurs solaires", "Postes sources et réseaux publics de transport d'électricité"],
  Carrelage: [
    "Étanchéité sous carrelage de toiture-terrasse, de piscine ou de cuvelage",
    "Revêtements verticaux agrafés ou attachés",
  ],
  Peinture: ["Imperméabilisation et étanchéité", "Sols coulés", "Isolation thermique par l'extérieur"],
  Menuiserie: [
    "Éléments structurels ou porteurs",
    "Verrières, vérandas, façades-rideaux, façades-semi-rideaux et façades-panneaux",
    "Support de maçonnerie, étanchéité de toiture-terrasse et éléments de charpente des terrasses bois",
  ],
  Plâtrerie: ["Éléments structurels ou porteurs", "Isolation thermique par l'extérieur", "Isolation frigorifique"],
  Parquet: ["Sols coulés", "Terrasses et platelages extérieurs"],
  Étanchéité: ["Étanchéité de piscines, cuvelages et réservoirs", "Couvertures textiles", "Couverture en petits éléments"],
  Façade: [
    "Isolation thermique par l'extérieur",
    "Façades-rideaux, façades-semi-rideaux et façades-panneaux",
    "Systèmes hors classes I1, I2, I3 et I4",
  ],
  Isolation: ["Isolation thermique par l'extérieur", "Isolation frigorifique", "Étanchéité de toiture-terrasse"],
  "Assèchement des murs": ["Étanchéité de toiture-terrasse et cuvelage", "Désamiantage", "Reprise structurelle des murs"],
  Serrurerie: ["Charpentes métalliques", "Vérandas", "Façades-rideaux"],
  Vitrerie: ["Vitrage extérieur collé (VEC) ou attaché (VEA)", "Façades-rideaux", "Verrières et vérandas"],
  Ascenseurs: ["Modifications de la structure porteuse du bâtiment"],
  "Électricité spéciale": ["Pose de capteurs solaires", "Réseaux publics de transport d'électricité"],
  "Réseaux secs": ["Pose de capteurs solaires", "Infrastructures publiques de télécommunications"],
  Assainissement: ["Stations d'épuration collectives", "Forage géothermique", "Étanchéité de cuvelage"],
  "Travaux publics": [
    "Ouvrages maritimes, portuaires et aéroportuaires",
    "Infrastructures routières et ferroviaires",
    "Ouvrages de traitement des déchets",
    "Ouvrages de télécommunications et de distribution d'énergie",
  ],
  "Pose de revêtements": ["Sols coulés", "Étanchéité sous carrelage de toiture-terrasse, de piscine ou de cuvelage"],
  Métallerie: ["Charpentes métalliques", "Vérandas", "Façades-rideaux"],
  "Peinture en bâtiment": ["Imperméabilisation et étanchéité", "Sols coulés", "Isolation thermique par l'extérieur"],
  Ravalement: ["Isolation thermique par l'extérieur", "Systèmes hors classes I1, I2, I3 et I4", "Façades-rideaux"],
  "Étanchéité toiture": ["Étanchéité de piscines et cuvelages", "Couvertures textiles", "Installation électrique des membranes photovoltaïques"],
  "Nettoyage toiture": ["Isolation thermique par l'extérieur", "Couvertures textiles", "Étanchéité de toiture-terrasse"],
  "Nettoyage toiture et peinture résine (I3 à I5)": [
    "Isolation thermique par l'extérieur",
    "Systèmes hors classes I1, I2, I3 et I4",
    "Couvertures textiles",
    "Étanchéité de toiture-terrasse",
  ],
  Architecte: [
    "Maîtrise d'ouvrage déléguée et mandat du maître de l'ouvrage",
    "Exécution des travaux",
    "Mission de décoration sans intervention technique",
  ],
  "Architecte intérieur": [
    "Intervention sur les éléments porteurs et la couverture",
    "Décoration pure sans intervention technique sur le bâti",
    "Exécution des travaux",
    "Maîtrise d'ouvrage déléguée",
  ],
  "Maître d'œuvre": [
    "Maîtrise d'ouvrage déléguée et mandat du maître de l'ouvrage",
    "Exécution directe des travaux",
    "Contrôle technique réglementaire",
  ],
  "Économiste de la construction": ["Plans d'architecte", "Études techniques spécialisées", "Exécution des travaux"],
  Métreur: ["Devis descriptifs", "Plans d'architecte", "Études techniques spécialisées"],
  "Coordinateur SPS": ["Maîtrise d'œuvre", "Contrôle technique", "Exécution des travaux"],
  "Diagnostiqueur immobilier": ["Maîtrise d'œuvre", "Repérage amiante s'il n'est pas la mission certifiée", "Travaux de mise en conformité"],
  Géomètre: ["Études qui fixent les limites des biens fonciers", "Maîtrise d'œuvre", "Travaux"],
  "Expert en construction": ["Mission d'étude technique", "Maîtrise d'œuvre", "Direction des travaux de reprise"],
  "Ingénieur structure": ["Études de fluides, d'électricité et de VRD", "Études géotechniques", "Exécution des travaux"],
  "Ingénieur fluides": ["Études de structure, de charpente et d'étanchéité", "Exécution et pose des équipements", "Maîtrise d'ouvrage déléguée"],
  "Conducteur de travaux": ["Réalisation de la synthèse", "Maîtrise d'œuvre de conception", "Exécution des ouvrages"],
  "Bureau de contrôle technique": ["Maîtrise d'œuvre", "Exécution des travaux", "Études d'exécution de l'entreprise"],
  "BET structure": ["Spécialités autres que la structure, le clos et le couvert", "Exécution des travaux", "Maîtrise d'ouvrage déléguée"],
  "BET fluides": ["Études de structure, de charpente et d'étanchéité", "Exécution des travaux", "Maîtrise d'ouvrage déléguée"],
  "BET thermique": ["Travaux d'isolation ou de chauffage", "Études de structure", "Maîtrise d'ouvrage déléguée"],
  "BET géotechnique": ["Travaux de fondation", "Études qui fixent les limites des biens fonciers", "Missions géotechniques non prévues au contrat"],
  "BET acoustique": ["Études de structure, de clos et de couvert", "Pose des isolants et des menuiseries", "Exécution des travaux"],
  "BET électricité": ["Études de structure et de fluides thermiques", "Pose de capteurs solaires", "Exécution des travaux"],
  "BET VRD": ["Ouvrages routiers, portuaires et ferroviaires", "Études de structure du bâtiment", "Exécution des travaux"],
  "BET façades": ["Isolation thermique par l'extérieur si elle n'est pas la mission", "Façades-rideaux si elles ne sont pas la mission", "Exécution des travaux"],
  "BET béton armé": ["Béton précontraint in situ si ce n'est pas la mission", "Études géotechniques", "Exécution des travaux"],
  "BET charpente métallique": ["Façades-rideaux", "Charpente bois", "Exécution des travaux"],
  "BET bois": ["Fondations et structures maçonnées", "Étanchéité des toitures-terrasses", "Exécution des travaux"],
  "BET fluides spéciaux": ["Captage géothermique non prévu à la mission", "Études de structure", "Exécution des travaux"],
  "BET environnement": ["Exécution des travaux", "Maîtrise d'œuvre", "Délimitation foncière"],
  "BET sécurité incendie": ["Fours et cheminées industriels", "Exécution des travaux", "Maîtrise d'œuvre complète"],
  "BET CVC": ["Système de captage géothermique", "Pose de capteurs solaires intégrés", "Exécution des travaux"],
  "BET assainissement": ["Stations d'épuration collectives", "Étanchéité de cuvelage", "Exécution des travaux"],
  "BET coordination": ["Réalisation de la synthèse", "Maîtrise d'œuvre de conception", "Exécution des ouvrages"],
  "BET économie de la construction": ["Plans d'architecte", "Études techniques spécialisées", "Exécution des travaux"],
  "BET structure métallique": ["Façades-rideaux", "Charpente bois", "Exécution des travaux"],
  "BET géomètre": ["Études qui fixent les limites des biens fonciers", "Maîtrise d'œuvre", "Travaux de fondation"],
}

/** Travaux accessoires — ne peuvent faire l'objet d'un marché séparé (sinon non garantis) */
export const TRAVAUX_ACCESSOIRES_NOTE =
  "Les travaux accessoires ou complémentaires ne peuvent faire l'objet d'un marché de travaux à part entière. L'attestation doit reproduire précisément l'activité objet du marché. Sinon, ces travaux sont réputés non garantis."

/** Retourne les exclusions pour une activité (légales + spécifiques) */
export function getExclusionsForActivite(activite: string): string[] {
  const specifiques = ACTIVITE_EXCLUSIONS[activite] ?? []
  return [...EXCLUSIONS_LEGALES_COMMUNES, ...specifiques]
}

// =============================================================================
// DOMmage Ouvrage — Nomenclature et garanties
// =============================================================================
// Références : Loi Spinetta 1978, Code civil art. 1792-1792-7
// Nomenclature SYCODES (AQC) : éléments d'ouvrage à l'origine des désordres
// https://sycodes.qualiteconstruction.com/nomenclatures
// =============================================================================

/** Garanties proposées sur le site (dommage ouvrage) */
export const DO_GARANTIES = {
  do: { code: "DO", libelle: "Dommages ouvrage", description: "Garantie obligatoire couvrant les dommages affectant la solidité ou l'usage de l'ouvrage pendant 10 ans après réception." },
  cnr: { code: "CNR", libelle: "Construction neuve et réhabilitation", description: "Garantie complémentaire selon contrat." },
  trc: { code: "TRC", libelle: "Tous risques chantier (maître d'ouvrage seul)", description: "Garantie dommages aux biens pendant la construction." },
  rcmo: { code: "RC MO", libelle: "RC Maître d'ouvrage", description: "Responsabilité civile du maître d'ouvrage." },
} as const

/** Garanties légales (Loi Spinetta) — termes techniques du site */
export const DO_GARANTIES_LEGALES = {
  I1: { code: "I1", libelle: "Garantie de parfait achèvement (GPA)", duree: "1 an après réception", description: "Désordres signalés par le maître d'ouvrage à la réception." },
  I2: { code: "I2", libelle: "Garantie de bon fonctionnement (GBF)", duree: "2 ans après réception", description: "Éléments d'équipement dissociables (facultative)." },
  I3: { code: "I3", libelle: "Garantie décennale", duree: "10 ans après réception", description: "Dommages compromettant la solidité ou rendant l'ouvrage impropre à sa destination." },
} as const

/** Nomenclature SYCODES — Éléments d'ouvrage (adaptée aux termes du site) */
export const DO_ELEMENTS_OUVRAGE = {
  /** 0 : Viabilité (VRD, mur de soutènement) */
  viabilite: {
    code: "0",
    libelle: "Viabilité",
    lots: ["Terrassement", "VRD", "Voiries", "Réseaux extérieurs", "Assainissement autonome", "Mur de soutènement"],
    siteTerm: "coutTravauxVrd",
    exclusions: ["Réalisation de piscines", "Travaux d'étanchéité des toitures terrasses"],
  },
  /** 1 : Infrastructures */
  infrastructures: {
    code: "1",
    libelle: "Infrastructures",
    lots: ["Fondations", "Fondations spéciales", "Reprises en sous-œuvre"],
    siteTerm: "gros œuvre",
    exclusions: [],
  },
  /** 2 : Solidité structurelle */
  solidite: {
    code: "2",
    libelle: "Solidité structurelle",
    lots: ["Gros œuvre", "Maçonnerie", "Béton armé", "Ossature"],
    siteTerm: "gros œuvre",
    exclusions: [],
  },
  /** 3 : Couverture et charpente */
  couvertureCharpente: {
    code: "3",
    libelle: "Couverture et charpente support",
    lots: ["Charpente", "Couverture", "Zinguerie"],
    siteTerm: "clos et couvert",
    exclusions: ["Couvertures textiles", "Étanchéités toitures terrasses"],
  },
  /** 4 : Toiture-terrasse */
  toitureTerrasse: {
    code: "4",
    libelle: "Toiture-terrasse",
    lots: ["Étanchéité toiture", "Étanchéité terrasse", "Complexe végétalisation"],
    siteTerm: "clos et couvert",
    exclusions: [],
  },
  /** 5 : Façade */
  facade: {
    code: "5",
    libelle: "Façade",
    lots: ["Ravalement", "Enduits", "Bardages", "Isolation thermique par l'extérieur"],
    siteTerm: "second œuvre",
    exclusions: ["Façades-rideaux, façades-semi-rideaux, façades-panneaux (lot distinct)"],
  },
  /** 6 : Menuiserie */
  menuiserie: {
    code: "6",
    libelle: "Menuiserie",
    lots: ["Menuiserie extérieure", "Menuiserie intérieure", "Huisseries"],
    siteTerm: "clos et couvert (ext.) / second œuvre (int.)",
    exclusions: ["Verrières", "Vérandas", "Éléments structurels ou porteurs"],
  },
  /** 7 : Partition / revêtement */
  partitionRevetement: {
    code: "7",
    libelle: "Partition et revêtement",
    lots: ["Plâtrerie", "Carrelage", "Parquet", "Peinture", "Cloisons"],
    siteTerm: "second œuvre",
    exclusions: ["Travaux purement esthétiques sans impact solidité", "Éléments structurels ou porteurs"],
  },
  /** 8 : Équipement génie climatique */
  genieClimatique: {
    code: "8",
    libelle: "Équipement génie climatique",
    lots: ["Plomberie", "Chauffage", "Climatisation", "VMC", "Électricité"],
    siteTerm: "second œuvre",
    exclusions: ["Géothermie", "Capteurs solaires intégrés"],
  },
  /** 9 : Autre équipement */
  autreEquipement: {
    code: "9",
    libelle: "Autre équipement",
    lots: ["Ascenseurs", "Piscines", "Photovoltaïque"],
    siteTerm: "lots techniques",
    exclusions: ["Modifications de la structure porteuse", "Fondations spéciales"],
  },
} as const

/** Lots couverts par la garantie clos et couvert (termes du site) */
export const DO_LOTS_CLOS_COUVERT = [
  { lot: "Terrassement", codeSycodes: "0", codeFfsa: "1.3" },
  { lot: "VRD", codeSycodes: "0", codeFfsa: "1.6" },
  { lot: "Gros œuvre", codeSycodes: "1-2", codeFfsa: "2.1, 2.2, 2.3" },
  { lot: "Charpente", codeSycodes: "3", codeFfsa: "2.4, 2.5, 2.6" },
  { lot: "Couverture", codeSycodes: "3", codeFfsa: "3.1" },
  { lot: "Menuiserie extérieure", codeSycodes: "6", codeFfsa: "3.9" },
] as const

/** Lots exclus de la garantie clos et couvert (second œuvre — non couverts en option clos et couvert) */
export const DO_LOTS_EXCLUS_CLOS_COUVERT = [
  "Plomberie",
  "Chauffage",
  "Climatisation",
  "Électricité",
  "Plâtrerie",
  "Carrelage",
  "Parquet",
  "Peinture",
  "Menuiserie intérieure",
  "Étanchéité toiture-terrasse",
  "Façade (ravalement, ITE)",
  "Isolation intérieure",
] as const

/** Types d'ouvrage (dommage-ouvrage-types.ts) */
export const DO_TYPES_OUVRAGE = {
  maison_individuelle: "Maison individuelle isolée",
  maison_jumelee: "Maison jumelée (toiture unique)",
  immeuble_logements: "Immeuble logements collectifs",
  immeuble_logements_commerces: "Immeuble logements et commerces",
  immeuble_bureaux: "Immeuble de bureaux",
  etablissement_soins_sportif_culturel: "Établissement de soins, sportif ou culturel",
  batiment_industriel: "Bâtiment industriel",
  autre: "Autres (chalets bois, groupe de maisons, etc.)",
} as const

/** Qualités maître d'ouvrage (termes du site) */
export const DO_QUALITES_MAITRE_OUVRAGE = {
  promoteur: "Promoteur immobilier, vendeur après achèvement",
  mandataire: "Mandataire du propriétaire",
  particulier_habitation: "Particulier — habitation",
  particulier_locatif: "Particulier — locatif",
  particulier_revente: "Particulier — revente",
  autre: "Autre qualité",
} as const

/** Exclusions dommage ouvrage (Loi Spinetta, ord. 8 juin 2005, usages assureurs) — termes du site */
export const DO_EXCLUSIONS = [
  "Dommages intentionnels",
  "Usure normale et défauts d'entretien",
  "Catastrophes naturelles exceptionnelles",
  "Vices apparents au moment de la réception",
  "Dommages immatériels non consécutifs à un dommage matériel garanti",
  "Causes étrangères (guerre, émeute, terrorisme)",
  "Travaux non déclarés lors de la souscription",
] as const

/** Exclusions absolues dommage ouvrage (ord. 8 juin 2005) — hors champ obligatoire */
export const DO_OUVRAGES_EXCLUS_ABSOLUS = [
  "Ouvrages de traitement de résidus et déchets",
  "Ouvrages d'infrastructures routières, portuaires, ferroviaires",
  "Ouvrages maritimes, lacustres, fluviaux",
] as const

/** Exclusions relatives dommage ouvrage (sauf si accessoires à un ouvrage couvert) */
export const DO_OUVRAGES_EXCLUS_RELATIFS = [
  "Ouvrages sportifs",
  "Ouvrages de télécommunications",
] as const

/** Assiette de prime — postes de coût prévisionnel (FormulaireDevisDommageOuvrage) */
export const DO_COUTS_PREVISIONNELS = {
  coutTravauxVrd: "Travaux y compris VRD privatifs",
  coutMateriauxMaitreOuvrage: "Matériaux fournis par le maître d'ouvrage",
  coutControleTechnique: "Honoraires Contrôle technique",
  coutEtudeSol: "Honoraires Étude de sol",
  coutMaitriseOeuvre: "Honoraires Maîtrise d'œuvre",
} as const

/** Retourne les lots clos et couvert pour affichage */
export function getLotsClosCouvert(): typeof DO_LOTS_CLOS_COUVERT {
  return DO_LOTS_CLOS_COUVERT
}

/** Retourne l'élément d'ouvrage SYCODES pour un lot du site */
export function getElementOuvragePourLot(lot: string): (typeof DO_ELEMENTS_OUVRAGE)[keyof typeof DO_ELEMENTS_OUVRAGE] | undefined {
  for (const [, elem] of Object.entries(DO_ELEMENTS_OUVRAGE)) {
    if (elem.lots.some((l) => l.toLowerCase().includes(lot.toLowerCase()))) return elem
  }
  return undefined
}

/** Éléments d'équipement dissociables — garantie biennale (I2) uniquement, hors décennale */
export const ELEMENTS_DISSOCIABLES_NOTE =
  "Les éléments d'équipement dissociables (retirables sans endommager le bâti) relèvent de la garantie de bon fonctionnement (I2, 2 ans), non de la garantie décennale. Ex. : pompe à chaleur, chauffage démontable."
