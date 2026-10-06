export type ActiviteFiche = {
  description: string
  exclusions: string[]
}

export function activiteAnchorId(activite: string): string {
  return activite
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

/**
 * Descriptifs et exclusions du menu déroulant décennale.
 * Chaque exclusion reprend le « ne sont pas compris » ou le « à l'exclusion de »
 * de la nomenclature France Assureurs 2019 (référentiel commun des assureurs
 * construction), ou, pour les professions intellectuelles, la limite équivalente
 * des nomenclatures de marché. Le texte est rédigé par Optimum : il ne copie
 * pas les conditions générales d'un assureur nommé.
 */
export const ACTIVITE_CATALOGUE: Record<string, ActiviteFiche> = {
  "Maçonnerie générale": {
    description: "Maçonnerie et béton armé courant, fondations superficielles, dallages, enduits hydrauliques et ouvertures. Correspond à l'activité 2.2 de la nomenclature France Assureurs.",
    exclusions: ["Parois de soutènement structurellement autonomes de plus de 2,5 m", "Revêtements muraux agrafés, attachés ou collés", "Fours et cheminées industriels", "Béton précontraint mis en tension sur le chantier", "Charpente préfabriquée dans l'industrie"],
  },
  "Béton armé": {
    description: "Coulage et mise en œuvre de béton armé pour poteaux, poutres, planchers et voiles, selon les plans de ferraillage.",
    exclusions: ["Béton précontraint mis en tension sur le chantier", "Fondations spéciales : pieux, micropieux, parois moulées et palplanches", "Parois de soutènement autonomes de plus de 2,5 m", "Revêtements muraux agrafés, attachés ou collés", "Fours et cheminées industriels"],
  },
  Coffrage: {
    description: "Fabrication, pose et dépose des coffrages nécessaires au coulage du béton, y compris l'étaiement courant.",
    exclusions: ["Études de structure et notes de calcul", "Béton précontraint mis en tension sur le chantier", "Parois de soutènement autonomes de plus de 2,5 m", "Fours et cheminées industriels"],
  },
  Ferraillage: {
    description: "Façonnage et pose des armatures en acier dans les ouvrages en béton armé, selon les plans d'exécution.",
    exclusions: ["Dimensionnement de la structure", "Béton précontraint mis en tension sur le chantier", "Fours et cheminées industriels", "Charpente métallique"],
  },
  "Construction maison individuelle": {
    description: "Réalisation d'une maison individuelle en entreprise générale ou en lots de gros œuvre, depuis les fondations jusqu'au hors d'eau hors d'air lorsque ces lots sont déclarés.",
    exclusions: ["Lots non reproduits sur l'attestation", "Béton précontraint in situ, fondations spéciales et désamiantage non déclarés", "Ouvrages exclus du régime obligatoire : routes, ports, ouvrages d'énergie", "Dommage ouvrage du maître d'ouvrage"],
  },
  "Charpente bois": {
    description: "Charpentes et structures en bois. Le traitement préventif et curatif du bois en fait partie. La couverture n'est garantie avec ce lot que si elle reste accessoire au marché de charpente.",
    exclusions: ["Façades-rideaux", "Étanchéité de toiture-terrasse", "Couverture, bardage ou traitement des bois lorsqu'ils font l'objet d'un marché distinct", "Fondations"],
  },
  "Charpente métallique": {
    description: "Fabrication et pose d'ossatures et de charpentes en acier pour bâtiments, auvents et portiques.",
    exclusions: ["Façades-rideaux", "Études de stabilité si elles ne font pas partie de la mission", "Ouvrages d'art et ponts", "Charpente et ossature bois"],
  },
  "Charpente lamellé-collé": {
    description: "Pose de structures en bois lamellé-collé de grande portée, y compris assemblages et appuis.",
    exclusions: ["Façades-rideaux", "Couvertures textiles", "Étanchéité de toiture-terrasse", "Fondations et massifs s'ils ne sont pas au lot"],
  },
  "Couverture tuiles": {
    description: "Pose et réfection de couvertures en tuiles, avec liteaux, écran et accessoires de toiture.",
    exclusions: ["Couvertures textiles", "Étanchéité de toitures-terrasses", "Installation électrique ou thermique des capteurs solaires"],
  },
  "Couverture ardoises": {
    description: "Pose et réparation de couvertures en ardoises naturelles ou fibres-ciment, y compris les raccords courants.",
    exclusions: ["Couvertures textiles", "Étanchéité de toitures-terrasses", "Installation électrique ou thermique des capteurs solaires", "Désamiantage de plaques anciennes", "Charpente porteuse si elle n'est pas au lot"],
  },
  "Couverture zinc": {
    description: "Couverture métallique en zinc, à tasseaux ou joint debout, avec façonnés associés.",
    exclusions: ["Couvertures textiles", "Étanchéité de toitures-terrasses", "Installation électrique ou thermique des capteurs solaires", "Chéneaux structurels relevant du gros œuvre"],
  },
  "Couverture bac acier": {
    description: "Pose de bacs acier de couverture, y compris fixations, faîtages et raccordements simples.",
    exclusions: ["Couvertures textiles", "Étanchéité de toitures-terrasses", "Bac acier utilisé comme seul support d'étanchéité", "Installation électrique ou thermique des capteurs solaires", "Charpente porteuse non déclarée"],
  },
  Zinguerie: {
    description: "Gouttières, chéneaux, noues, abergements et évacuations d'eaux pluviales en zinc ou métal équivalent.",
    exclusions: ["Étanchéité de toiture-terrasse", "Couvertures textiles", "Descentes enterrées et réseaux VRD", "Installation électrique ou thermique des capteurs solaires", "Réparation de charpente"],
  },
  "Étanchéité toiture": {
    description: "Mise en œuvre de complexes d'étanchéité sur toitures, en membranes bitumineuses ou synthétiques.",
    exclusions: ["Couverture en petits éléments (tuiles, ardoises)", "Étanchéité de piscines, cuvelages et réservoirs", "Couvertures textiles", "Installation électrique des membranes photovoltaïques"],
  },
  "Étanchéité terrasse": {
    description: "Étanchéité des toitures-terrasses et balcons, y compris relevés, évacuations et protection courante du complexe.",
    exclusions: ["Étanchéité de cuvelage, de réservoir et de piscine", "Couvertures textiles", "Structure porteuse du plancher", "Carrelage collé sans que l'étanchéité soit dans le même marché"],
  },
  Bardage: {
    description: "Pose de bardages rapportés de façade, ossature secondaire et parements, hors façades-rideaux.",
    exclusions: ["Façades-rideaux, façades-semi-rideaux et façades-panneaux", "Isolation thermique par l'extérieur par enduit collé, qui est un autre procédé", "Étanchéité à l'air relevant d'un autre lot"],
  },
  "Façade ravalement": {
    description: "Enduits de façade, ravalement et revêtements d'imperméabilité à base de polymères de classes I1, I2, I3, ainsi que les systèmes d'étanchéité de classe I4. Il n'existe pas de classe I5.",
    exclusions: ["Isolation thermique par l'extérieur", "Systèmes présentés hors classes I1, I2, I3 et I4", "Façades-rideaux, façades-semi-rideaux et façades-panneaux", "Reprise structurelle des murs"],
  },
  "Isolation thermique extérieure": {
    description: "Isolation des façades par l'extérieur, avec enduit ou parement collé, selon un système sous avis technique.",
    exclusions: ["Bardage ventilé, qui est un autre procédé", "Façades-rideaux, façades-semi-rideaux et façades-panneaux", "Ravalement simple sans isolant", "Toiture et menuiseries"],
  },
  "Isolation intérieure": {
    description: "Pose d'isolants thermiques en doublage intérieur, sur murs, rampants ou plafonds.",
    exclusions: ["Isolation thermique par l'extérieur", "Isolation frigorifique", "Étanchéité et pare-vapeur de toiture-terrasse"],
  },
  "Électricité générale": {
    description: "Réseaux électriques du bâtiment, chauffage électrique, raccordement des appareils, parafoudre et VMC posée avec ce lot. La nomenclature (activité 5.5) y inclut aussi la domotique et la gestion technique du bâtiment.",
    exclusions: ["Pose de capteurs solaires photovoltaïques", "Postes sources et réseaux publics de transport d'électricité", "Ouvrages de télécommunications publics"],
  },
  "Courants faibles": {
    description: "Câblage et raccordement des réseaux de communication, d'alarme et de contrôle d'accès du bâtiment.",
    exclusions: ["Infrastructures publiques de télécommunications", "Pose de capteurs solaires", "Équipements nomades non fixés à l'ouvrage", "Courants forts s'ils ne sont pas déclarés"],
  },
  Domotique: {
    description: "Automatismes et gestion technique du bâtiment. Dans la nomenclature, ce lot est déjà compris dans l'électricité (5.5) ; cette ligne sert l'entreprise qui ne déclare que la domotique.",
    exclusions: ["Pose de capteurs solaires", "Supervision de process industriel", "Réseaux publics de télécommunications", "Modification de l'installation électrique de puissance si le lot électricité n'est pas déclaré"],
  },
  Photovoltaïque: {
    description: "Installations photovoltaïques en toiture ou au sol, avec branchements électriques, stockage et raccordement. Le raccord d'étanchéité et l'écran sous-toiture restent accessoires.",
    exclusions: ["Fondations spéciales", "Modification de la structure porteuse de l'ouvrage", "Étanchéité complète de toiture, qui est un lot distinct"],
  },
  "Bornes recharge": {
    description: "Pose de bornes de recharge pour véhicules, raccordées à l'installation électrique du bâtiment.",
    exclusions: ["Pose de capteurs solaires", "Voirie et génie civil de parking public", "Réseau public de distribution au-delà du raccordement", "Bornes simplement posées sans raccordement fixe"],
  },
  "Plomberie sanitaire": {
    description: "Eau chaude et froide sanitaires, appareils, réseaux de fluide ou de gaz, distribution de chauffage par eau y compris les radiateurs, gouttières, descentes d'eaux pluviales et solins. Les tranchées de raccordement sont accessoires.",
    exclusions: ["Appareils de production de chauffage (chaudière, pompe à chaleur, poêle)", "Installations de géothermie", "Pose de capteurs solaires intégrés"],
  },
  "Chauffage central": {
    description: "Production et distribution de chauffage à eau chaude, radiateurs ou planchers, et eau chaude sanitaire associée.",
    exclusions: ["Système de captage géothermique", "Pose de capteurs solaires intégrés", "Inserts et cheminées", "Réseau de gaz enterré en domaine public"],
  },
  "Chauffage gaz": {
    description: "Installation intérieure de chauffage et d'eau chaude fonctionnant au gaz, avec évacuation des produits de combustion.",
    exclusions: ["Système de captage géothermique", "Pose de capteurs solaires intégrés", "Inserts, cheminées, fours et cheminées industriels", "Réseau gaz en voirie"],
  },
  "Pompe à chaleur": {
    description: "Pose de pompes à chaleur air-eau ou air-air raccordées au bâtiment, unités extérieures comprises.",
    exclusions: ["Système de captage géothermique", "Pose de capteurs solaires intégrés", "Inserts et cheminées", "Piscines et leur chauffage"],
  },
  Climatisation: {
    description: "Installations de climatisation et de conditionnement d'air du bâtiment, production et distribution.",
    exclusions: ["Système de captage géothermique", "Pose de capteurs solaires intégrés", "Isolation frigorifique et chambres froides"],
  },
  Ventilation: {
    description: "Réseaux de ventilation et bouches de soufflage ou d'extraction du bâtiment.",
    exclusions: ["Système de captage géothermique", "Pose de capteurs solaires intégrés", "Inserts et cheminées", "Désenfumage réglementaire d'ERP s'il n'est pas déclaré"],
  },
  "VMC simple flux": {
    description: "Pose de ventilation mécanique simple flux, gaines, bouches et rejet en toiture ou en façade.",
    exclusions: ["Système de captage géothermique", "Pose de capteurs solaires intégrés", "Double flux et échangeur", "Inserts et cheminées"],
  },
  "VMC double flux": {
    description: "Pose de ventilation double flux avec échangeur, réseaux de soufflage et d'extraction.",
    exclusions: ["Système de captage géothermique", "Pose de capteurs solaires intégrés", "Puits climatiques", "Inserts et cheminées"],
  },
  "Génie climatique": {
    description: "Ensemble chauffage, ventilation et climatisation d'un bâtiment, lorsque ces lots sont exercés par la même entreprise.",
    exclusions: ["Système de captage géothermique", "Pose de capteurs solaires intégrés", "Inserts et cheminées", "Installations industrielles de process"],
  },
  "Réseaux hydrauliques": {
    description: "Colonnes et distributions d'eau de chauffage ou d'eau sanitaire à l'intérieur du bâtiment.",
    exclusions: ["Installations de géothermie", "Pose de capteurs solaires intégrés", "Appareils de production de chauffage", "Réseaux publics et branchements en voirie"],
  },
  "Réseaux gaz": {
    description: "Canalisations de gaz à l'intérieur des bâtiments, jusqu'aux appareils, dans le respect de la réglementation.",
    exclusions: ["Installations de géothermie", "Pose de capteurs solaires intégrés", "Réseaux concessionnaires en domaine public", "Appareils de chauffage si le lot chauffage n'est pas déclaré"],
  },
  Plâtrerie: {
    description: "Ouvrages intérieurs en plâtre : enduits, cloisons traditionnelles et éléments de staff courants.",
    exclusions: ["Éléments structurels ou porteurs", "Isolation thermique par l'extérieur", "Plafonds tendus, qui relèvent de la peinture", "Isolation frigorifique"],
  },
  "Plaques de plâtre": {
    description: "Pose de plaques de plâtre sur ossature pour cloisons, doublages et plafonds.",
    exclusions: ["Éléments structurels ou porteurs", "Isolation thermique par l'extérieur", "Isolation frigorifique", "Peinture de finition si elle est un autre lot"],
  },
  "Staff stuc": {
    description: "Ouvrages décoratifs et moulures en staff ou stuc, fixés à l'ouvrage.",
    exclusions: ["Éléments structurels ou porteurs", "Isolation thermique par l'extérieur", "Peinture décorative seule", "Restauration d'œuvres protégées au titre des monuments historiques"],
  },
  "Faux plafonds": {
    description: "Plafonds suspendus techniques ou esthétiques, ossatures et dalles, à l'intérieur des bâtiments.",
    exclusions: ["Éléments structurels ou porteurs", "Isolation frigorifique", "Isolation thermique par l'extérieur", "Désenfumage et sprinklers non déclarés"],
  },
  "Cloisons sèches": {
    description: "Cloisons de distribution en plaques sur ossature, sans rôle porteur.",
    exclusions: ["Éléments structurels ou porteurs", "Isolation thermique par l'extérieur", "Isolation frigorifique", "Chapes et sols coulés"],
  },
  "Menuiserie intérieure": {
    description: "Portes intérieures, placards, habillages et agencements bois fixés au bâti.",
    exclusions: ["Éléments structurels ou porteurs", "Menuiseries extérieures, verrières et vérandas", "Aménagement de cuisines ou de salles de bains lorsqu'il fait l'objet d'un marché distinct"],
  },
  "Menuiserie extérieure": {
    description: "Fenêtres, portes-fenêtres et fermetures extérieures en bois, PVC ou aluminium.",
    exclusions: ["Verrières et vérandas", "Façades-rideaux, façades-semi-rideaux et façades-panneaux", "Support de maçonnerie, étanchéité de toiture-terrasse et éléments de charpente des terrasses bois", "Capteurs solaires"],
  },
  "Pose fenêtres": {
    description: "Dépose et pose de fenêtres, calfeutrement et habillages courants des tableaux.",
    exclusions: ["Verrières et vérandas", "Façades-rideaux, façades-semi-rideaux et façades-panneaux", "Création d'ouverture dans un mur porteur", "Capteurs solaires"],
  },
  "Pose portes": {
    description: "Pose de blocs-portes intérieurs ou de portes palières, avec quincaillerie courante.",
    exclusions: ["Éléments structurels ou porteurs", "Verrières et vérandas", "Charpentes métalliques", "Portes de garage industrielles non déclarées"],
  },
  Serrurerie: {
    description: "Ouvrages courants de serrurerie : grilles, garde-corps légers, portes métalliques et quincaillerie.",
    exclusions: ["Charpentes métalliques", "Vérandas", "Façades-rideaux", "Vitrage extérieur collé (VEC) ou attaché (VEA)"],
  },
  Métallerie: {
    description: "Fabrication et pose d'ouvrages métalliques secondaires : escaliers, garde-corps, ossatures légères.",
    exclusions: ["Charpentes métalliques", "Vérandas", "Façades-rideaux", "Ouvrages d'art"],
  },
  "Garde-corps": {
    description: "Pose de garde-corps de balcons, escaliers et terrasses, fixés à l'ouvrage.",
    exclusions: ["Charpentes métalliques", "Vérandas", "Vitrage extérieur collé (VEC) ou attaché (VEA)", "Garde-corps d'ouvrages publics routiers"],
  },
  Carrelage: {
    description: "Pose de carrelage au sol et au mur, y compris la préparation courante du support et les joints.",
    exclusions: ["Étanchéité sous carrelage de toiture-terrasse, de piscine ou de cuvelage", "Revêtements verticaux agrafés ou attachés", "Sols sportifs de grands ouvrages non déclarés"],
  },
  Faïence: {
    description: "Pose de faïence et de revêtements muraux en locaux humides.",
    exclusions: ["Étanchéité sous carrelage de piscine ou de cuvelage", "Revêtements verticaux agrafés ou attachés", "Étanchéité des parois de douche si elle est un lot distinct"],
  },
  "Sol souple": {
    description: "Pose de sols PVC, linoléum et revêtements souples collés, avec préparation du support.",
    exclusions: ["Sols coulés", "Étanchéité de toiture-terrasse, de piscine ou de cuvelage", "Planchers porteurs"],
  },
  Parquet: {
    description: "Pose de parquets flottants, cloués ou collés, et finitions de surface courantes.",
    exclusions: ["Sols coulés", "Planchers porteurs et solivage", "Terrasses et platelages extérieurs, qui relèvent des menuiseries extérieures"],
  },
  Moquette: {
    description: "Pose de moquettes collées ou tendues dans les locaux intérieurs.",
    exclusions: ["Sols coulés", "Étanchéité de toiture-terrasse, de piscine ou de cuvelage", "Planchers porteurs"],
  },
  "Peinture intérieure": {
    description: "Peintures, RPE, RSE, RME et préparations des supports, murs et plafonds. L'activité 4.7 de la nomenclature ne comprend pas l'imperméabilisation.",
    exclusions: ["Imperméabilisation et étanchéité", "Sols coulés", "Isolation thermique par l'extérieur"],
  },
  "Peinture extérieure": {
    description: "Peintures de façade et ravalement en peinture, sans revêtement d'imperméabilité. Les classes I1 à I4 relèvent du ravalement (activité 3.4), pas de la peinture.",
    exclusions: ["Imperméabilisation et systèmes d'étanchéité de façade de classes I1 à I4", "Isolation thermique par l'extérieur", "Sols coulés"],
  },
  "Revêtement mural": {
    description: "Pose de papiers peints, toiles et revêtements muraux décoratifs collés.",
    exclusions: ["Imperméabilisation et étanchéité", "Sols coulés", "Revêtements extérieurs, bardages et isolation par l'extérieur"],
  },
  Terrassement: {
    description: "Déblais, fouilles, remblais et réglages de plateformes pour des ouvrages de bâtiment.",
    exclusions: ["Comblement de carrières", "Infrastructures routières, ferroviaires, portuaires et aéroportuaires", "Pieux, micropieux, parois moulées et parois de soutènement autonomes"],
  },
  VRD: {
    description: "Voiries légères et réseaux divers desservant un bâtiment : branchements, regards et couches de forme courantes.",
    exclusions: ["Routes, autoroutes, voies ferrées, ouvrages portuaires et aéroportuaires", "Ouvrages de traitement de déchets et de distribution d'énergie", "Étanchéité des toitures-terrasses", "Réalisation de piscines"],
  },
  Assainissement: {
    description: "Réseaux d'eaux usées et installations d'assainissement autonome liés à un bâtiment.",
    exclusions: ["Stations d'épuration collectives et ouvrages de traitement de déchets", "Forages et captage géothermique", "Étanchéité de cuvelage, de réservoir et de piscine", "Réseaux publics au-delà de la limite de propriété"],
  },
  Canalisations: {
    description: "Pose de canalisations enterrées d'alimentation ou d'évacuation au droit du bâtiment.",
    exclusions: ["Réseaux publics de transport et de distribution d'énergie", "Forage géothermique et puisage d'eau", "Étanchéité de cuvelage", "Appareils de production de chauffage"],
  },
  "Aménagement extérieur": {
    description: "Allées, murets de jardin, escaliers extérieurs et aménagements maçonnés autour du bâtiment.",
    exclusions: ["Étanchéité des toitures-terrasses", "Réalisation de piscines", "Parois de soutènement structurellement autonomes de plus de 2,5 m", "Voirie publique, routes et ouvrages portuaires"],
  },
  "Pose pavés": {
    description: "Pose de pavés sur assise préparée, pour cours, allées et abords de bâtiment.",
    exclusions: ["Chaussées publiques, routes et voies ferrées", "Étanchéité de toiture-terrasse, de piscine ou de cuvelage", "Comblement de carrières", "Réalisation de piscines"],
  },
  "Pose dalles": {
    description: "Pose de dalles extérieures sur plots ou sur mortier, pour terrasses et cheminements.",
    exclusions: ["Étanchéité sous carrelage de toiture-terrasse, de piscine ou de cuvelage", "Revêtements agrafés ou attachés", "Voirie lourde et chaussées publiques", "Comblement de carrières"],
  },
  Terrasses: {
    description: "Réalisation de terrasses extérieures : structure légère, platelage ou dallage, selon le procédé déclaré.",
    exclusions: ["Étanchéité de toiture-terrasse", "Support de maçonnerie et éléments de charpente s'ils sont un autre lot", "Fondations, structures maçonnées et capteurs solaires des vérandas", "Réalisation de piscines"],
  },
  "Piscine béton": {
    description: "Construction de bassins en béton armé et de leurs équipements scellés.",
    exclusions: ["Système de captage géothermique", "Pose de capteurs solaires intégrés", "Étanchéité de cuvelage non déclarée", "Plages et voiries publiques"],
  },
  "Piscine coque": {
    description: "Pose de coques de piscine préfabriquées, remblai et raccordements associés.",
    exclusions: ["Système de captage géothermique", "Pose de capteurs solaires intégrés", "Comblement de carrières", "Fabrication de la coque en usine hors pose"],
  },
  "Piscine kit": {
    description: "Montage de piscines en kit liées à l'ouvrage, avec pose et raccordements.",
    exclusions: ["Système de captage géothermique", "Pose de capteurs solaires intégrés", "Piscines hors-sol simplement posées et déplaçables", "Fondations spéciales"],
  },
  Clôtures: {
    description: "Pose de clôtures fixées au sol, en grillage, panneaux ou maçonnerie légère, en limite de propriété privée.",
    exclusions: ["Parois de soutènement autonomes de plus de 2,5 m", "Clôtures d'ouvrages autoroutiers, portuaires ou aéroportuaires", "Étanchéité des toitures-terrasses", "Réalisation de piscines"],
  },
  Portails: {
    description: "Pose de portails et portillons, y compris scellements et motorisation lorsqu'elle est incluse au marché.",
    exclusions: ["Charpentes métalliques", "Vérandas", "Piliers de maçonnerie porteurs non déclarés", "Voirie publique"],
  },
  "Paysagisme maçonnerie": {
    description: "Ouvrages maçonnés de jardin : murets, escaliers, bordures et petits ouvrages liés au bâtiment.",
    exclusions: ["Étanchéité des toitures-terrasses", "Réalisation de piscines", "Parois structurellement autonomes soutenant les terres au-delà de 1,5 m", "Routes, ports et ouvrages de traitement de déchets"],
  },
  "Ossature bois": {
    description: "Mise en œuvre de murs à ossature bois, planchers et contreventements, hors fondations.",
    exclusions: ["Fondations", "Structures maçonnées", "Couverture lorsqu'elle fait l'objet d'un marché distinct", "Étanchéité des toitures-terrasses"],
  },
  "Construction modulaire": {
    description: "Assemblage et pose de modules de construction reliés aux fondations et aux réseaux du site.",
    exclusions: ["Fondations spéciales", "Façades-rideaux", "Étanchéité des toitures-terrasses", "Aménagements intérieurs non déclarés"],
  },
  "Structure métallique": {
    description: "Ossatures métalliques porteuses de bâtiments, portiques et planchers collaborants.",
    exclusions: ["Façades-rideaux", "Charpente et ossature bois", "Fondations spéciales", "Ouvrages d'art et ponts"],
  },
  "Béton préfabriqué": {
    description: "Pose d'éléments préfabriqués en béton : poutres, prédalles, prémurs et escaliers.",
    exclusions: ["Béton précontraint mis en tension sur le chantier", "Fondations spéciales", "Parois de soutènement autonomes de plus de 2,5 m", "Fours et cheminées industriels"],
  },
  "Isolation phonique": {
    description: "Mise en œuvre de complexes d'isolation acoustique intérieurs, cloisons et plafonds.",
    exclusions: ["Isolation thermique par l'extérieur", "Isolation frigorifique", "Études de structure", "Pose des menuiseries si elle est un lot séparé"],
  },
  "Protection incendie": {
    description: "Pose de protections passives liées au bâti : flocage, portes et calfeutrements coupe-feu déclarés.",
    exclusions: ["Fours et cheminées industriels", "Sprinklers et colonnes humides s'ils ne sont pas au lot", "Désenfumage mécanique non déclaré", "Modification de la structure porteuse"],
  },
  "Traitement façade": {
    description: "Traitements de surface des façades : hydrofuge, anti-mousse et réparations non structurelles.",
    exclusions: ["Isolation thermique par l'extérieur", "Systèmes d'imperméabilité hors classes I1 à I4", "Désamiantage", "Reprise de fissures structurelles"],
  },
  Désamiantage: {
    description: "Retrait ou confinement de matériaux contenant de l'amiante, sous processus réglementé.",
    exclusions: ["Démolition générale de l'ouvrage", "Reconstruction des ouvrages déposés", "Traitement des insectes xylophages et des champignons", "Terrassement et comblement de carrières"],
  },
  Démolition: {
    description: "Démolition totale ou partielle d'ouvrages par moyens manuels ou mécaniques.",
    exclusions: ["Utilisation d'explosifs", "Désamiantage", "Comblement de carrières", "Terrassement lorsqu'il fait l'objet d'un marché distinct"],
  },
  "Sciage béton": {
    description: "Sciage, carottage et découpe de béton pour créer des ouvertures ou déposer des éléments.",
    exclusions: ["Utilisation d'explosifs", "Désamiantage", "Reprise structurelle et renforts", "Fours et cheminées industriels"],
  },
  "Fondation spéciale": {
    description: "Pieux, micropieux, parois moulées et reprises en sous-œuvre nécessitant un procédé de fondation spéciale.",
    exclusions: ["Fondations superficielles courantes : semelles, radiers et puits courts", "Maçonnerie et béton armé en élévation", "Études de sol et interprétation géotechnique", "Amélioration des sols hors pieux, micropieux et parois moulées"],
  },
  Forage: {
    description: "Forages liés à un ouvrage de bâtiment, hors exploitation de carrière.",
    exclusions: ["Interprétation géotechnique des résultats", "Pieux, micropieux, barrettes et parois moulées", "Comblement de carrières", "Sondages miniers"],
  },
  "Forage micropieux": {
    description: "Forage et réalisation de micropieux pour reprendre des fondations ou stabiliser un ouvrage.",
    exclusions: ["Fondations superficielles courantes", "Maçonnerie et béton armé en élévation", "Étude géotechnique", "Amélioration des sols hors micropieux"],
  },
  "Injection résine": {
    description: "Injections de résine pour stabiliser un sol ou traiter une fissure, selon un procédé défini.",
    exclusions: ["Pieux, micropieux, barrettes, parois moulées et palplanches", "Parois de soutènement structurellement autonomes", "Géomembranes", "Étanchéité de cuvelage", "Reprise totale des fondations"],
  },
  "Traitement bois": {
    description: "Traitement curatif ou préventif des bois de structure contre les insectes et les champignons.",
    exclusions: ["Remplacement de la charpente ou des menuiseries", "Désamiantage", "Étanchéité des toitures-terrasses", "Pieux, micropieux et parois moulées"],
  },
  "Traitement termites et injection produit chimique charpente et sol": {
    description: "Traitement préventif ou curatif contre les termites par injection de produit chimique dans les bois de charpente et dans le sol. Les produits sont mis en œuvre selon leur homologation.",
    exclusions: ["Remplacement de la charpente", "Désamiantage", "Injection de résine de confortement des sols", "Pieux, micropieux et reprise totale des fondations", "Étanchéité des toitures-terrasses"],
  },
  "Traitement humidité": {
    description: "Traitement des remontées capillaires et de l'humidité des murs, avec travaux préparatoires associés.",
    exclusions: ["Étanchéité de toiture-terrasse et cuvelage", "Désamiantage", "Reprise structurelle des murs", "Drainage et VRD lorsqu'ils font l'objet d'un marché distinct"],
  },
  "Rénovation énergétique": {
    description: "Travaux groupés d'amélioration énergétique du bâtiment, limités aux lots réellement déclarés.",
    exclusions: ["Lots non reproduits sur l'attestation", "Captage géothermique et fondations spéciales non déclarés", "Pose de capteurs solaires si l'activité photovoltaïque n'est pas déclarée", "Désamiantage non déclaré"],
  },
  "Rénovation TCE": {
    description: "Rénovation tous corps d'état d'un bâtiment existant. Seuls les corps de métier figurant au contrat sont garantis.",
    exclusions: ["Activités non reproduites sur l'attestation", "Désamiantage, explosifs et fondations spéciales non déclarés", "Ouvrages exclus du régime obligatoire : routes, ports, ouvrages d'énergie", "Dommage ouvrage du propriétaire"],
  },
  "Contractant général": {
    description: "Entreprise qui porte la réalisation d'une opération et coordonne les lots. La garantie suit les activités souscrites, pas l'intitulé commercial seul.",
    exclusions: ["Lots dont l'activité n'est pas reproduite sur l'attestation", "Désamiantage, explosifs et fondations spéciales non déclarés", "Mission de maître d'ouvrage", "Dommage ouvrage"],
  },
  "Entreprise générale bâtiment": {
    description: "Exécution de plusieurs lots de bâtiment par une même entreprise. Chaque activité exercée doit être déclarée.",
    exclusions: ["Métiers non reproduits sur l'attestation", "Ouvrages exclus du régime obligatoire : routes, ports, ouvrages d'énergie", "Désamiantage, explosifs et fondations spéciales non déclarés", "Conception pure sans exécution"],
  },
  "Maintenance bâtiment": {
    description: "Entretien et réparations d'un bâtiment existant. Dans la nomenclature, l'entretien est déjà inclus dans la réalisation du métier : cette ligne vise l'entreprise dont le marché est seulement la maintenance.",
    exclusions: ["Création d'ouvrage neuf non déclarée sous l'activité de pose", "Désamiantage et fondations spéciales", "Activités non reproduites sur l'attestation", "Contrats de facility management hors bâtiment"],
  },
  "Maintenance chauffage": {
    description: "Entretien et dépannage d'installations de chauffage existantes. Une pose neuve se déclare sous l'activité chauffage correspondante.",
    exclusions: ["Système de captage géothermique", "Pose de capteurs solaires intégrés", "Inserts et cheminées", "Installation neuve non déclarée au lot chauffage"],
  },
  "Maintenance climatisation": {
    description: "Entretien et dépannage de systèmes de climatisation existants. Une pose neuve se déclare sous l'activité climatisation.",
    exclusions: ["Système de captage géothermique", "Pose de capteurs solaires intégrés", "Isolation frigorifique", "Installation neuve non déclarée au lot climatisation"],
  },
  "Maintenance plomberie": {
    description: "Entretien, recherche de fuite et maintien des réseaux sanitaires existants, y compris la distribution de chauffage par eau déjà en place. Une création neuve se déclare en plomberie.",
    exclusions: ["Appareils de production de chauffage", "Installations de géothermie", "Pose de capteurs solaires intégrés", "Création de réseaux neufs non déclarée en plomberie"],
  },
  Architecte: {
    description: "Missions de conception et de direction de l'exécution des travaux, dans le périmètre du contrat de maîtrise d'œuvre.",
    exclusions: ["Maîtrise d'ouvrage déléguée et mandat du maître de l'ouvrage", "Exécution des travaux", "Mission de décoration sans intervention technique", "Contrôle technique réglementaire"],
  },
  "Architecte intérieur": {
    description: "Conception et suivi d'aménagements intérieurs, sans modification de la structure porteuse.",
    exclusions: ["Intervention sur les éléments porteurs et la couverture", "Décoration pure sans intervention technique sur le bâti", "Exécution des travaux", "Maîtrise d'ouvrage déléguée"],
  },
  "Maître d'œuvre": {
    description: "Conception, consultation des entreprises et direction de chantier, selon la mission signée.",
    exclusions: ["Maîtrise d'ouvrage déléguée et mandat du maître de l'ouvrage", "Exécution directe des travaux", "Contrôle technique réglementaire", "Mission limitée à l'ordonnancement, au pilotage et à la coordination"],
  },
  "Bureau études techniques": {
    description: "Études techniques de conception ou d'exécution, notes et plans, dans la spécialité déclarée.",
    exclusions: ["Spécialités non visées au contrat", "Exécution des travaux", "Contrôle technique indépendant", "Maîtrise d'ouvrage déléguée"],
  },
  "Ingénieur structure": {
    description: "Calcul et plans de structure : béton, bois ou acier, selon la mission.",
    exclusions: ["Études de fluides, d'électricité et de VRD", "Études géotechniques", "Exécution des travaux", "Maîtrise d'ouvrage déléguée"],
  },
  "Ingénieur fluides": {
    description: "Études de chauffage, ventilation, plomberie et électricité, sans pose.",
    exclusions: ["Études de structure, de charpente et d'étanchéité", "Exécution et pose des équipements", "Captage géothermique non prévu à la mission", "Maîtrise d'ouvrage déléguée"],
  },
  Thermicien: {
    description: "Études thermiques réglementaires et préconisations de lots énergétiques.",
    exclusions: ["Travaux d'isolation ou de chauffage", "Études d'exécution de génie climatique", "Engagement de résultat de consommation", "Maîtrise d'ouvrage déléguée"],
  },
  Géotechnicien: {
    description: "Missions d'étude de sol et d'avis géotechniques pour des ouvrages de bâtiment.",
    exclusions: ["Travaux de fondation, pieux et micropieux", "Études qui fixent les limites des biens fonciers", "Missions géotechniques non prévues au contrat", "Maîtrise d'œuvre de conception du bâtiment"],
  },
  "Économiste construction": {
    description: "Métrés, estimations et suivi économique des travaux, en appui de la maîtrise d'œuvre.",
    exclusions: ["Plans d'architecte", "Études techniques spécialisées", "Exécution des travaux", "Maîtrise d'ouvrage déléguée"],
  },
  "Programmiste bâtiment": {
    description: "Définition du programme fonctionnel d'une opération de construction, en amont de la conception.",
    exclusions: ["Mission technique sur les ouvrages", "Maîtrise d'œuvre", "Exécution des travaux", "Maîtrise d'ouvrage déléguée"],
  },
  OPC: {
    description: "Ordonnancement, pilotage et coordination du chantier, sans se substituer aux entreprises.",
    exclusions: ["Réalisation de la synthèse", "Maîtrise d'œuvre de conception ou de direction des travaux", "Exécution des ouvrages", "Coordination SPS si elle n'est pas la mission"],
  },
  "Audit technique bâtiment": {
    description: "Constat et analyse technique d'un bâtiment existant, dans le cadre d'une mission écrite.",
    exclusions: ["Maîtrise d'œuvre", "Études d'exécution", "Exécution des travaux", "Diagnostics réglementaires non inclus à la mission"],
  },
  "Assistance maîtrise d'ouvrage": {
    description: "Conseil au maître d'ouvrage pour préparer et suivre une opération, sans diriger les travaux.",
    exclusions: ["Maîtrise d'ouvrage déléguée et mandat du maître de l'ouvrage", "Maîtrise d'œuvre", "Signature des marchés au nom du client", "Exécution des travaux"],
  },
  "Coordination SPS": {
    description: "Coordination de la sécurité et de la protection de la santé sur une opération de bâtiment.",
    exclusions: ["Maîtrise d'œuvre", "Contrôle technique", "Études techniques de structure", "Exécution des protections collectives par les entreprises"],
  },
  "Diagnostic technique immobilier": {
    description: "Diagnostics réglementaires du bâtiment, limités au périmètre certifié et missionné.",
    exclusions: ["Maîtrise d'œuvre", "Repérage amiante s'il n'est pas la mission certifiée", "Travaux de mise en conformité", "Études qui fixent les limites des biens fonciers"],
  },
  "Conseil énergétique bâtiment": {
    description: "Conseil sur la performance énergétique d'un projet ou d'un bâtiment existant.",
    exclusions: ["Marchés de travaux et exécution", "Études d'exécution", "Engagement de résultat sur les factures", "Maîtrise d'ouvrage déléguée"],
  },
  "Expert bâtiment": {
    description: "Avis technique sur un désordre ou un ouvrage, hors mission de maîtrise d'œuvre.",
    exclusions: ["Mission d'étude technique", "Maîtrise d'œuvre", "Direction des travaux de reprise", "Expertise judiciaire si elle n'est pas la mission confiée"],
  },
  "Ingénierie environnementale bâtiment": {
    description: "Études environnementales liées à un projet de bâtiment : eau, énergie, matériaux.",
    exclusions: ["Exécution des travaux", "Maîtrise d'œuvre", "Études qui fixent les limites des biens fonciers", "Sites et sols pollués industriels hors bâtiment"],
  },
  "Programmation immobilière": {
    description: "Aide à la définition du programme d'une opération immobilière de bâtiment.",
    exclusions: ["Mission technique sur les ouvrages", "Promotion et vente", "Maîtrise d'œuvre", "Exécution des travaux"],
  },
  "Études acoustiques": {
    description: "Mesures et études acoustiques du bâtiment, avec préconisations.",
    exclusions: ["Études de structure, de clos et de couvert", "Pose des isolants et des menuiseries", "Maîtrise d'œuvre complète", "Exécution des travaux"],
  },
  "Nettoyage toiture et peinture résine (I3 à I5)": {
    description: "Nettoyage de couverture et revêtements de façade à base de polymères. Les classes officielles (DTU 42.1 et nomenclature, activité 3.4) sont I1, I2, I3 et I4. Il n'existe pas de classe I5 : le menu de devis conserve cet intitulé commercial. Ces travaux ne remplacent pas une étanchéité ni une réfection de couverture.",
    exclusions: ["Isolation thermique par l'extérieur", "Systèmes hors classes I1, I2, I3 et I4", "Couvertures textiles", "Étanchéité de toiture-terrasse", "Réfection de charpente et remplacement de la couverture"],
  },
}

export function assertActiviteCatalogueComplet(activites: readonly { activite: string }[]): void {
  const missing = activites.filter((item) => !ACTIVITE_CATALOGUE[item.activite]).map((item) => item.activite)
  if (missing.length > 0) {
    throw new Error(`Catalogue décennale incomplet : ${missing.join(", ")}`)
  }
}
