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
 * Les exclusions reprennent la nomenclature France Assureurs 2019
 * et les limites usuelles des contrats du marché. Elles ne copient
 * pas les conditions générales d'un assureur nommé.
 */
export const ACTIVITE_CATALOGUE: Record<string, ActiviteFiche> = {
  "Maçonnerie générale": {
    description: "Maçonnerie et béton armé courant, fondations superficielles, dallages, enduits hydrauliques et ouvertures. Correspond à l'activité 2.2 de la nomenclature France Assureurs.",
    exclusions: ["Parois de soutènement autonomes de plus de 2,5 m", "Revêtements muraux agrafés, attachés ou collés", "Fours et cheminées industriels"],
  },
  "Béton armé": {
    description: "Coulage et mise en œuvre de béton armé pour poteaux, poutres, planchers et voiles, selon les plans de ferraillage.",
    exclusions: ["Béton précontraint mis en tension sur le chantier", "Fondations spéciales de type pieux ou micropieux", "Ouvrages d'art et infrastructures routières"],
  },
  Coffrage: {
    description: "Fabrication, pose et dépose des coffrages nécessaires au coulage du béton, y compris l'étaiement courant.",
    exclusions: ["Études de structure et notes de calcul", "Fourniture et pose du ferraillage si ce lot n'est pas déclaré", "Coffrages glissants d'ouvrages exceptionnels"],
  },
  Ferraillage: {
    description: "Façonnage et pose des armatures en acier dans les ouvrages en béton armé, selon les plans d'exécution.",
    exclusions: ["Dimensionnement de la structure", "Précontrainte", "Soudure de charpente métallique"],
  },
  "Construction maison individuelle": {
    description: "Réalisation d'une maison individuelle en entreprise générale ou en lots de gros œuvre, depuis les fondations jusqu'au hors d'eau hors d'air lorsque ces lots sont déclarés.",
    exclusions: ["Lots non déclarés sur l'attestation (électricité, plomberie, étanchéité)", "Dommage ouvrage du maître d'ouvrage", "Maisons hors référentiel technique ou sans plans"],
  },
  "Charpente bois": {
    description: "Charpentes et structures en bois. Le traitement préventif et curatif du bois en fait partie. La couverture n'est garantie avec ce lot que si elle reste accessoire au marché de charpente.",
    exclusions: ["Façades-rideaux", "Étanchéité de toiture-terrasse", "Couverture lorsqu'elle fait l'objet d'un marché de travaux distinct"],
  },
  "Charpente métallique": {
    description: "Fabrication et pose d'ossatures et de charpentes en acier pour bâtiments, auvents et portiques.",
    exclusions: ["Façades-rideaux et façades-panneaux", "Études de stabilité si elles ne font pas partie de la mission", "Ouvrages d'art et ponts"],
  },
  "Charpente lamellé-collé": {
    description: "Pose de structures en bois lamellé-collé de grande portée, y compris assemblages et appuis.",
    exclusions: ["Fabrication industrielle hors pose", "Couverture textile", "Fondations et massifs s'ils ne sont pas au lot"],
  },
  "Couverture tuiles": {
    description: "Pose et réfection de couvertures en tuiles, avec liteaux, écran et accessoires de toiture.",
    exclusions: ["Étanchéité de toiture-terrasse", "Couvertures textiles", "Installation électrique des capteurs solaires"],
  },
  "Couverture ardoises": {
    description: "Pose et réparation de couvertures en ardoises naturelles ou fibres-ciment, y compris les raccords courants.",
    exclusions: ["Étanchéité bitumineuse de terrasse", "Charpente porteuse si elle n'est pas au lot", "Désamiantage de plaques anciennes"],
  },
  "Couverture zinc": {
    description: "Couverture métallique en zinc, à tasseaux ou joint debout, avec façonnés associés.",
    exclusions: ["Étanchéité de toitures-terrasses", "Chéneaux structurels relevant du gros œuvre", "Capteurs solaires intégrés et leur raccordement électrique"],
  },
  "Couverture bac acier": {
    description: "Pose de bacs acier de couverture, y compris fixations, faîtages et raccordements simples.",
    exclusions: ["Bac acier support d'étanchéité de terrasse", "Couvertures textiles ou photovoltaïques intégrées", "Charpente porteuse non déclarée"],
  },
  Zinguerie: {
    description: "Gouttières, chéneaux, noues, abergements et évacuations d'eaux pluviales en zinc ou métal équivalent.",
    exclusions: ["Étanchéité de toiture-terrasse", "Descentes enterrées et réseaux VRD", "Réparation de charpente"],
  },
  "Étanchéité toiture": {
    description: "Mise en œuvre de complexes d'étanchéité sur toitures, en membranes bitumineuses ou synthétiques.",
    exclusions: ["Couverture en petits éléments (tuiles, ardoises)", "Étanchéité de piscines et cuvelages", "Isolant et protection lourde s'ils sont un lot distinct non déclaré"],
  },
  "Étanchéité terrasse": {
    description: "Étanchéité des toitures-terrasses et balcons, y compris relevés, évacuations et protection courante du complexe.",
    exclusions: ["Carrelage collé sans que l'étanchéité soit dans le même marché", "Étanchéité de cuvelage et de piscine", "Structure porteuse du plancher"],
  },
  Bardage: {
    description: "Pose de bardages rapportés de façade, ossature secondaire et parements, hors façades-rideaux.",
    exclusions: ["Façades-rideaux, semi-rideaux et façades-panneaux", "Étanchéité à l'air relevant d'un autre lot", "Isolation thermique par l'extérieur si elle n'est pas déclarée"],
  },
  "Façade ravalement": {
    description: "Enduits de façade, ravalement et revêtements d'imperméabilité à base de polymères de classes I1, I2, I3, ainsi que les systèmes d'étanchéité de classe I4. Il n'existe pas de classe I5.",
    exclusions: ["Isolation thermique par l'extérieur", "Reprise structurelle des murs", "Systèmes présentés hors classes I1 à I4"],
  },
  "Isolation thermique extérieure": {
    description: "Isolation des façades par l'extérieur, avec enduit ou parement collé, selon un système sous avis technique.",
    exclusions: ["Bardage ventilé si c'est un autre procédé", "Ravalement simple sans isolant", "Toiture et menuiseries"],
  },
  "Isolation intérieure": {
    description: "Pose d'isolants thermiques en doublage intérieur, sur murs, rampants ou plafonds.",
    exclusions: ["Isolation par l'extérieur", "Isolation frigorifique de chambres froides", "Étanchéité et pare-vapeur de toiture-terrasse"],
  },
  "Électricité générale": {
    description: "Réseaux électriques du bâtiment, chauffage électrique, raccordement des appareils, parafoudre et VMC posée avec ce lot. La nomenclature (activité 5.5) y inclut aussi la domotique et la gestion technique du bâtiment.",
    exclusions: ["Pose de capteurs solaires photovoltaïques", "Postes sources et réseaux publics de transport d'électricité"],
  },
  "Courants faibles": {
    description: "Câblage et raccordement des réseaux de communication, d'alarme et de contrôle d'accès du bâtiment.",
    exclusions: ["Infrastructures publiques de télécommunications", "Équipements nomades non fixés à l'ouvrage", "Courants forts s'ils ne sont pas déclarés"],
  },
  Domotique: {
    description: "Automatismes et gestion technique du bâtiment. Dans la nomenclature, ce lot est déjà compris dans l'électricité (5.5) ; cette ligne sert l'entreprise qui ne déclare que la domotique.",
    exclusions: ["Supervision de process industriel", "Réseaux publics de télécommunications", "Modification de l'installation électrique de puissance si le lot électricité n'est pas déclaré"],
  },
  Photovoltaïque: {
    description: "Installations photovoltaïques en toiture ou au sol, avec branchements électriques, stockage et raccordement. Le raccord d'étanchéité et l'écran sous-toiture restent accessoires.",
    exclusions: ["Fondations spéciales", "Modification de la structure porteuse", "Étanchéité complète de toiture, qui est un lot distinct"],
  },
  "Bornes recharge": {
    description: "Pose de bornes de recharge pour véhicules, raccordées à l'installation électrique du bâtiment.",
    exclusions: ["Voirie et génie civil de parking public", "Réseau public de distribution", "Bornes simplement posées sans raccordement fixe"],
  },
  "Plomberie sanitaire": {
    description: "Eau chaude et froide sanitaires, appareils, réseaux de fluide ou de gaz, distribution de chauffage par eau y compris les radiateurs, gouttières, descentes d'eaux pluviales et solins. Les tranchées de raccordement sont accessoires.",
    exclusions: ["Appareils de production de chauffage (chaudière, pompe à chaleur, poêle)", "Installations de géothermie", "Capteurs solaires intégrés"],
  },
  "Chauffage central": {
    description: "Production et distribution de chauffage à eau chaude, radiateurs ou planchers, et eau chaude sanitaire associée.",
    exclusions: ["Captage géothermique", "Inserts et conduits de cheminée maçonnés", "Réseau de gaz enterré en domaine public"],
  },
  "Chauffage gaz": {
    description: "Installation intérieure de chauffage et d'eau chaude fonctionnant au gaz, avec évacuation des produits de combustion.",
    exclusions: ["Réseau gaz en voirie", "Chaudières industrielles", "Ramonnage et entretien annuel s'ils sont seuls"],
  },
  "Pompe à chaleur": {
    description: "Pose de pompes à chaleur air-eau ou air-air raccordées au bâtiment, unités extérieures comprises.",
    exclusions: ["Forage et captage géothermique", "Réseau de chauffage préexistant non repris", "Piscines et leur chauffage"],
  },
  Climatisation: {
    description: "Installations de climatisation et de conditionnement d'air du bâtiment, production et distribution.",
    exclusions: ["Captage géothermique", "Capteurs solaires", "Chambres froides industrielles et isolation frigorifique"],
  },
  Ventilation: {
    description: "Réseaux de ventilation et bouches de soufflage ou d'extraction du bâtiment.",
    exclusions: ["Production de chaud ou de froid", "Désenfumage réglementaire d'ERP s'il n'est pas déclaré", "Conduits de cheminée"],
  },
  "VMC simple flux": {
    description: "Pose de ventilation mécanique simple flux, gaines, bouches et rejet en toiture ou en façade.",
    exclusions: ["Double flux et échangeur", "Chaudière et production d'eau chaude", "Étanchéité de toiture"],
  },
  "VMC double flux": {
    description: "Pose de ventilation double flux avec échangeur, réseaux de soufflage et d'extraction.",
    exclusions: ["Production de chauffage", "Étanchéité à l'air du bâti hors réseau", "Puits climatiques et géothermie"],
  },
  "Génie climatique": {
    description: "Ensemble chauffage, ventilation et climatisation d'un bâtiment, lorsque ces lots sont exercés par la même entreprise.",
    exclusions: ["Captage géothermique", "Lots de plomberie sanitaire non déclarés", "Installations industrielles de process"],
  },
  "Réseaux hydrauliques": {
    description: "Colonnes et distributions d'eau de chauffage ou d'eau sanitaire à l'intérieur du bâtiment.",
    exclusions: ["Forages", "Réseaux publics et branchements en voirie", "Production de chaleur"],
  },
  "Réseaux gaz": {
    description: "Canalisations de gaz à l'intérieur des bâtiments, jusqu'aux appareils, dans le respect de la réglementation.",
    exclusions: ["Réseaux concessionnaires en domaine public", "Citernes enterrées", "Appareils de chauffage si le lot chauffage n'est pas déclaré"],
  },
  Plâtrerie: {
    description: "Ouvrages intérieurs en plâtre : enduits, cloisons traditionnelles et éléments de staff courants.",
    exclusions: ["Éléments porteurs ou structurels", "Isolation thermique par l'extérieur", "Plafonds tendus et lots de peinture"],
  },
  "Plaques de plâtre": {
    description: "Pose de plaques de plâtre sur ossature pour cloisons, doublages et plafonds.",
    exclusions: ["Structure du bâtiment", "Isolation par l'extérieur", "Joints et peinture de finition s'ils sont un autre lot"],
  },
  "Staff stuc": {
    description: "Ouvrages décoratifs et moulures en staff ou stuc, fixés à l'ouvrage.",
    exclusions: ["Éléments porteurs", "Restauration d'œuvres protégées au titre des monuments historiques", "Peinture décorative seule"],
  },
  "Faux plafonds": {
    description: "Plafonds suspendus techniques ou esthétiques, ossatures et dalles, à l'intérieur des bâtiments.",
    exclusions: ["Structure de plancher", "Désenfumage et sprinklers non déclarés", "Isolation frigorifique"],
  },
  "Cloisons sèches": {
    description: "Cloisons de distribution en plaques sur ossature, sans rôle porteur.",
    exclusions: ["Murs porteurs et refends", "Portes coupe-feu si elles ne sont pas au lot", "Chapes et sols"],
  },
  "Menuiserie intérieure": {
    description: "Portes intérieures, placards, habillages et agencements bois fixés au bâti.",
    exclusions: ["Éléments structurels", "Menuiseries extérieures et fenêtres", "Cuisines électroménager simplement posées"],
  },
  "Menuiserie extérieure": {
    description: "Fenêtres, portes-fenêtres et fermetures extérieures en bois, PVC ou aluminium.",
    exclusions: ["Vérandas et verrières", "Façades-rideaux", "Maçonnerie des tableaux et appuis"],
  },
  "Pose fenêtres": {
    description: "Dépose et pose de fenêtres, calfeutrement et habillages courants des tableaux.",
    exclusions: ["Vérandas", "Création d'ouverture dans un mur porteur", "Volets roulants si le lot n'est pas déclaré"],
  },
  "Pose portes": {
    description: "Pose de blocs-portes intérieurs ou de portes palières, avec quincaillerie courante.",
    exclusions: ["Portes de garage industrielles et rideaux métalliques coupe-feu non déclarés", "Serrures de sûreté haute sécurité si lot séparé", "Huisseries structurelles en acier"],
  },
  Serrurerie: {
    description: "Ouvrages courants de serrurerie : grilles, garde-corps légers, portes métalliques et quincaillerie.",
    exclusions: ["Charpente métallique", "Vérandas", "Portes blindées de coffre-fort et ouvrages de sécurité bancaire"],
  },
  Métallerie: {
    description: "Fabrication et pose d'ouvrages métalliques secondaires : escaliers, garde-corps, ossatures légères.",
    exclusions: ["Charpentes et portiques porteurs", "Façades-rideaux", "Ouvrages d'art"],
  },
  "Garde-corps": {
    description: "Pose de garde-corps de balcons, escaliers et terrasses, fixés à l'ouvrage.",
    exclusions: ["Structure du balcon", "Garde-corps d'ouvrages publics routiers", "Vitrages extérieurs collés"],
  },
  Carrelage: {
    description: "Pose de carrelage au sol et au mur, y compris la préparation courante du support et les joints.",
    exclusions: ["Étanchéité sous carrelage de terrasse, piscine ou cuvelage", "Chapes flottantes relevant d'un autre lot", "Revêtements agrafés en façade"],
  },
  Faïence: {
    description: "Pose de faïence et de revêtements muraux en locaux humides.",
    exclusions: ["Étanchéité des parois de douche à l'italienne si elle est un lot distinct", "Carrelage de sol extérieur", "Peinture"],
  },
  "Sol souple": {
    description: "Pose de sols PVC, linoléum et revêtements souples collés, avec préparation du support.",
    exclusions: ["Sols coulés en résine", "Étanchéité", "Chape de ravoirage structurelle"],
  },
  Parquet: {
    description: "Pose de parquets flottants, cloués ou collés, et finitions de surface courantes.",
    exclusions: ["Sols coulés", "Planchers porteurs et solivage", "Parquets extérieurs de terrasse"],
  },
  Moquette: {
    description: "Pose de moquettes collées ou tendues dans les locaux intérieurs.",
    exclusions: ["Sols techniques surélevés", "Étanchéité", "Revêtements de sols sportifs de grands ouvrages"],
  },
  "Peinture intérieure": {
    description: "Peintures, RPE, RSE, RME et préparations des supports, murs et plafonds. L'activité 4.7 de la nomenclature ne comprend pas l'imperméabilisation.",
    exclusions: ["Imperméabilisation et étanchéité", "Sols coulés"],
  },
  "Peinture extérieure": {
    description: "Peintures de façade et ravalement en peinture, sans revêtement d'imperméabilité. Les classes I1 à I4 relèvent du ravalement (activité 3.4), pas de la peinture.",
    exclusions: ["Revêtements d'imperméabilité et d'étanchéité de façade (I1 à I4)", "Isolation thermique par l'extérieur", "Sols coulés"],
  },
  "Revêtement mural": {
    description: "Pose de papiers peints, toiles et revêtements muraux décoratifs collés.",
    exclusions: ["Étanchéité", "Isolation", "Revêtements extérieurs et bardages"],
  },
  Terrassement: {
    description: "Déblais, fouilles, remblais et réglages de plateformes pour des ouvrages de bâtiment.",
    exclusions: ["Comblement de carrières", "Terrassements d'infrastructures routières et ferroviaires", "Soutènements autonomes de grande hauteur"],
  },
  VRD: {
    description: "Voiries légères et réseaux divers desservant un bâtiment : branchements, regards et couches de forme courantes.",
    exclusions: ["Routes, autoroutes et voies ferrées", "Réseaux concessionnaires au-delà de la limite de propriété", "Ouvrages de traitement de déchets"],
  },
  Assainissement: {
    description: "Réseaux d'eaux usées et installations d'assainissement autonome liés à un bâtiment.",
    exclusions: ["Stations d'épuration collectives", "Forages d'eau", "Étanchéité de cuvelage"],
  },
  Canalisations: {
    description: "Pose de canalisations enterrées d'alimentation ou d'évacuation au droit du bâtiment.",
    exclusions: ["Réseaux publics de transport", "Forage", "Chaufferies et appareils"],
  },
  "Aménagement extérieur": {
    description: "Allées, murets de jardin, escaliers extérieurs et aménagements maçonnés autour du bâtiment.",
    exclusions: ["Piscines", "Voirie publique", "Murs de soutènement de plus de 2,5 m"],
  },
  "Pose pavés": {
    description: "Pose de pavés sur assise préparée, pour cours, allées et abords de bâtiment.",
    exclusions: ["Chaussées publiques", "Étanchéité de terrasse", "Terrassement de grande masse"],
  },
  "Pose dalles": {
    description: "Pose de dalles extérieures sur plots ou sur mortier, pour terrasses et cheminements.",
    exclusions: ["Étanchéité située sous les dalles si elle n'est pas au lot", "Dallages industriels porteurs", "Voirie lourde"],
  },
  Terrasses: {
    description: "Réalisation de terrasses extérieures : structure légère, platelage ou dallage, selon le procédé déclaré.",
    exclusions: ["Étanchéité de toiture-terrasse", "Fondations spéciales", "Piscines"],
  },
  "Piscine béton": {
    description: "Construction de bassins en béton armé et de leurs équipements scellés.",
    exclusions: ["Étanchéité indépendante non déclarée", "Locaux techniques de chauffage s'ils sont un autre lot", "Plages et voiries"],
  },
  "Piscine coque": {
    description: "Pose de coques de piscine préfabriquées, remblai et raccordements associés.",
    exclusions: ["Fabrication de la coque en usine", "Terrassement de carrière", "Traitement d'eau chimique hors équipement scellé"],
  },
  "Piscine kit": {
    description: "Montage de piscines en kit liées à l'ouvrage, avec pose et raccordements.",
    exclusions: ["Piscines hors-sol simplement posées et déplaçables", "Gros œuvre du bâtiment", "Abri télescopique si lot distinct"],
  },
  Clôtures: {
    description: "Pose de clôtures fixées au sol, en grillage, panneaux ou maçonnerie légère, en limite de propriété privée.",
    exclusions: ["Murs de soutènement", "Clôtures d'ouvrages autoroutiers ou portuaires", "Portails motorisés si le lot n'est pas déclaré"],
  },
  Portails: {
    description: "Pose de portails et portillons, y compris scellements et motorisation lorsqu'elle est incluse au marché.",
    exclusions: ["Piliers de maçonnerie porteurs non déclarés", "Contrôle d'accès de site industriel", "Voirie"],
  },
  "Paysagisme maçonnerie": {
    description: "Ouvrages maçonnés de jardin : murets, escaliers, bordures et petits ouvrages liés au bâtiment.",
    exclusions: ["Plantations et entretien d'espaces verts", "Piscines", "Soutènements de plus de 2,5 m"],
  },
  "Ossature bois": {
    description: "Mise en œuvre de murs à ossature bois, planchers et contreventements, hors fondations.",
    exclusions: ["Fondations et soubassements maçonnés", "Étanchéité des toitures-terrasses", "Revêtements de façade s'ils sont un lot séparé"],
  },
  "Construction modulaire": {
    description: "Assemblage et pose de modules de construction reliés aux fondations et aux réseaux du site.",
    exclusions: ["Fabrication industrielle des modules hors pose", "Fondations spéciales", "Aménagements intérieurs non déclarés"],
  },
  "Structure métallique": {
    description: "Ossatures métalliques porteuses de bâtiments, portiques et planchers collaborants.",
    exclusions: ["Façades-rideaux", "Charpente bois", "Protection incendie par flocage si lot distinct"],
  },
  "Béton préfabriqué": {
    description: "Pose d'éléments préfabriqués en béton : poutres, prédalles, prémurs et escaliers.",
    exclusions: ["Fabrication en usine", "Précontrainte sur chantier", "Fondations spéciales"],
  },
  "Isolation phonique": {
    description: "Mise en œuvre de complexes d'isolation acoustique intérieurs, cloisons et plafonds.",
    exclusions: ["Correction de la structure pour tenue au feu", "Menuiseries extérieures acoustiques si lot séparé", "Isolation par l'extérieur"],
  },
  "Protection incendie": {
    description: "Pose de protections passives liées au bâti : flocage, portes et calfeutrements coupe-feu déclarés.",
    exclusions: ["Sprinklers et colonnes humides s'ils ne sont pas au lot", "Système de sécurité incendie SSI complet non déclaré", "Désenfumage mécanique"],
  },
  "Traitement façade": {
    description: "Traitements de surface des façades : hydrofuge, anti-mousse et réparations non structurelles.",
    exclusions: ["Isolation thermique par l'extérieur", "Reprise de fissures structurelles", "Désamiantage"],
  },
  Désamiantage: {
    description: "Retrait ou confinement de matériaux contenant de l'amiante, sous processus réglementé.",
    exclusions: ["Démolition générale du bâtiment", "Déchets autres que ceux du chantier d'amiante", "Reconstruction des ouvrages déposés"],
  },
  Démolition: {
    description: "Démolition totale ou partielle d'ouvrages par moyens manuels ou mécaniques.",
    exclusions: ["Explosifs", "Désamiantage", "Terrassement de la plateforme après démolition s'il n'est pas au lot"],
  },
  "Sciage béton": {
    description: "Sciage, carottage et découpe de béton pour créer des ouvertures ou déposer des éléments.",
    exclusions: ["Reprise structurelle et renforts", "Démolition à l'explosif", "Désamiantage"],
  },
  "Fondation spéciale": {
    description: "Pieux, micropieux, parois moulées et reprises en sous-œuvre nécessitant un procédé de fondation spéciale.",
    exclusions: ["Fondations superficielles courantes seules", "Études de sol", "Soutènements provisoires non prévus au marché"],
  },
  Forage: {
    description: "Forages liés à un ouvrage de bâtiment, hors exploitation de carrière.",
    exclusions: ["Captage d'eau potable et géothermie profonde non déclarés", "Comblement de carrières", "Sondages miniers"],
  },
  "Forage micropieux": {
    description: "Forage et réalisation de micropieux pour reprendre des fondations ou stabiliser un ouvrage.",
    exclusions: ["Étude géotechnique", "Injection de confortement non prévue", "Gros œuvre en élévation"],
  },
  "Injection résine": {
    description: "Injections de résine pour stabiliser un sol ou traiter une fissure, selon un procédé défini.",
    exclusions: ["Reprise totale des fondations", "Étanchéité de cuvelage", "Garantie de résultat géotechnique sans étude"],
  },
  "Traitement bois": {
    description: "Traitement curatif ou préventif des bois de structure contre les insectes et les champignons.",
    exclusions: ["Remplacement de charpente", "Bois de menuiserie décorative seule", "Désamiantage"],
  },
  "Traitement termites et injection produit chimique charpente et sol": {
    description: "Traitement préventif ou curatif contre les termites par injection de produit chimique dans les bois de charpente et dans le sol. Les produits sont mis en œuvre selon leur homologation.",
    exclusions: [
      "Remplacement de la charpente",
      "Menuiserie décorative seule",
      "Désamiantage",
      "Injection de résine de stabilisation",
      "Reprise totale des fondations",
      "Garantie de résultat géotechnique sans étude",
    ],
  },
  "Traitement humidité": {
    description: "Traitement des remontées capillaires et de l'humidité des murs, avec travaux préparatoires associés.",
    exclusions: ["Étanchéité de toiture et de façade", "Drainage VRD", "Reprise structurelle des murs"],
  },
  "Rénovation énergétique": {
    description: "Travaux groupés d'amélioration énergétique du bâtiment, limités aux lots réellement déclarés.",
    exclusions: ["Lots non inscrits sur l'attestation", "Aides et audits énergétiques sans travaux", "Production d'énergie au sol"],
  },
  "Rénovation TCE": {
    description: "Rénovation tous corps d'état d'un bâtiment existant. Seuls les corps de métier figurant au contrat sont garantis.",
    exclusions: ["Activités non listées sur l'attestation", "Désamiantage et fondations spéciales non déclarés", "Dommage ouvrage du propriétaire"],
  },
  "Contractant général": {
    description: "Entreprise qui porte la réalisation d'une opération et coordonne les lots. La garantie suit les activités souscrites, pas l'intitulé commercial seul.",
    exclusions: ["Lots sous-traités dont l'activité n'est pas garantie au contrat", "Mission de maître d'ouvrage", "Dommage ouvrage"],
  },
  "Entreprise générale bâtiment": {
    description: "Exécution de plusieurs lots de bâtiment par une même entreprise. Chaque activité exercée doit être déclarée.",
    exclusions: ["Métiers absents de l'attestation", "Ouvrages exclus du régime obligatoire (routes, ports, énergie)", "Conception pure sans exécution"],
  },
  "Maintenance bâtiment": {
    description: "Entretien et réparations d'un bâtiment existant. Dans la nomenclature, l'entretien est déjà inclus dans la réalisation du métier : cette ligne vise l'entreprise dont le marché est seulement la maintenance.",
    exclusions: ["Création d'ouvrage neuf non déclarée sous l'activité de pose", "Contrats de facility management hors bâtiment"],
  },
  "Maintenance chauffage": {
    description: "Entretien et dépannage d'installations de chauffage existantes. Une pose neuve se déclare sous l'activité chauffage correspondante.",
    exclusions: ["Installation neuve non déclarée au lot chauffage", "Réseaux gaz en voirie", "Captage géothermique"],
  },
  "Maintenance climatisation": {
    description: "Entretien et dépannage de systèmes de climatisation existants. Une pose neuve se déclare sous l'activité climatisation.",
    exclusions: ["Installation neuve non déclarée au lot climatisation", "Captage géothermique", "Capteurs solaires intégrés"],
  },
  "Maintenance plomberie": {
    description: "Entretien, recherche de fuite et maintien des réseaux sanitaires existants, y compris la distribution de chauffage par eau déjà en place. Une création neuve se déclare en plomberie.",
    exclusions: ["Création de réseaux neufs non déclarée en plomberie", "Appareils de production de chauffage", "Installations de géothermie"],
  },
  Architecte: {
    description: "Missions de conception et de direction de l'exécution des travaux, dans le périmètre du contrat de maîtrise d'œuvre.",
    exclusions: ["Mission limitée à la décoration sans intervention technique", "Exécution des travaux", "Garantie de coût hors mission écrite"],
  },
  "Architecte intérieur": {
    description: "Conception et suivi d'aménagements intérieurs, sans modification de la structure porteuse.",
    exclusions: ["Travaux structurels", "Décoration pure sans effet sur le bâti", "Exécution en entreprise"],
  },
  "Maître d'œuvre": {
    description: "Conception, consultation des entreprises et direction de chantier, selon la mission signée.",
    exclusions: ["Substitution au maître d'ouvrage", "Exécution directe des travaux", "Contrôle technique réglementaire"],
  },
  "Bureau études techniques": {
    description: "Études techniques de conception ou d'exécution, notes et plans, dans la spécialité déclarée.",
    exclusions: ["Travaux", "Missions hors spécialité inscrite au contrat", "Contrôle technique indépendant"],
  },
  "Ingénieur structure": {
    description: "Calcul et plans de structure : béton, bois ou acier, selon la mission.",
    exclusions: ["Exécution sur chantier", "Études de sol", "Charpente posée par l'ingénieur"],
  },
  "Ingénieur fluides": {
    description: "Études de chauffage, ventilation, plomberie et électricité, sans pose.",
    exclusions: ["Installation des équipements", "Géothermie profonde non prévue à la mission", "Exploitation-maintenance"],
  },
  Thermicien: {
    description: "Études thermiques réglementaires et préconisations de lots énergétiques.",
    exclusions: ["Travaux d'isolation ou de chauffage", "Audit énergétique sans lien avec un ouvrage à construire", "Garantie de consommation réelle"],
  },
  Géotechnicien: {
    description: "Missions d'étude de sol et d'avis géotechniques pour des ouvrages de bâtiment.",
    exclusions: ["Travaux de fondation", "Délimitation foncière", "Missions géotechniques non prévues au contrat de mission"],
  },
  "Économiste construction": {
    description: "Métrés, estimations et suivi économique des travaux, en appui de la maîtrise d'œuvre.",
    exclusions: ["Plans d'exécution", "Études techniques de structure", "Engagement forfaitaire de l'entreprise"],
  },
  "Programmiste bâtiment": {
    description: "Définition du programme fonctionnel d'une opération de construction, en amont de la conception.",
    exclusions: ["Maîtrise d'œuvre", "Travaux", "Montage juridique et financier de la promotion"],
  },
  OPC: {
    description: "Ordonnancement, pilotage et coordination du chantier, sans se substituer aux entreprises.",
    exclusions: ["Conception technique", "Exécution des ouvrages", "Coordination SPS si elle n'est pas la mission"],
  },
  "Audit technique bâtiment": {
    description: "Constat et analyse technique d'un bâtiment existant, dans le cadre d'une mission écrite.",
    exclusions: ["Maîtrise d'œuvre de réparation", "Diagnostics réglementaires non inclus à la mission", "Travaux"],
  },
  "Assistance maîtrise d'ouvrage": {
    description: "Conseil au maître d'ouvrage pour préparer et suivre une opération, sans diriger les travaux.",
    exclusions: ["Signature des marchés au nom du client", "Maîtrise d'œuvre d'exécution", "Travaux"],
  },
  "Coordination SPS": {
    description: "Coordination de la sécurité et de la protection de la santé sur une opération de bâtiment.",
    exclusions: ["Maîtrise d'œuvre de conception", "Contrôle technique", "Exécution des protections collectives par les entreprises"],
  },
  "Diagnostic technique immobilier": {
    description: "Diagnostics réglementaires du bâtiment, limités au périmètre certifié et missionné.",
    exclusions: ["Maîtrise d'œuvre", "Travaux de mise en conformité", "Expertise judiciaire"],
  },
  "Conseil énergétique bâtiment": {
    description: "Conseil sur la performance énergétique d'un projet ou d'un bâtiment existant.",
    exclusions: ["Réalisation des travaux", "Engagement de résultat sur les factures", "Études d'exécution CVC"],
  },
  "Expert bâtiment": {
    description: "Avis technique sur un désordre ou un ouvrage, hors mission de maîtrise d'œuvre.",
    exclusions: ["Direction des travaux de reprise", "Études d'exécution", "Défense judiciaire"],
  },
  "Ingénierie environnementale bâtiment": {
    description: "Études environnementales liées à un projet de bâtiment : eau, énergie, matériaux.",
    exclusions: ["Travaux", "Autorisations administratives obtenues à la place du maître d'ouvrage", "Sites et sols pollués industriels hors bâtiment"],
  },
  "Programmation immobilière": {
    description: "Aide à la définition du programme d'une opération immobilière de bâtiment.",
    exclusions: ["Promotion et vente", "Maîtrise d'œuvre", "Travaux"],
  },
  "Études acoustiques": {
    description: "Mesures et études acoustiques du bâtiment, avec préconisations.",
    exclusions: ["Pose des isolants et menuiseries", "Études de structure", "Salles de spectacle hors mission écrite"],
  },
  "Nettoyage toiture et peinture résine (I3 à I5)": {
    description: "Nettoyage de couverture et revêtements de façade à base de polymères. Les classes officielles (DTU 42.1 et nomenclature, activité 3.4) sont I1, I2, I3 et I4. Il n'existe pas de classe I5 : le menu de devis conserve cet intitulé commercial. Ces travaux ne remplacent pas une étanchéité ni une réfection de couverture.",
    exclusions: ["Isolation thermique par l'extérieur", "Revêtements hors classes I1, I2, I3 et I4", "Réfection de charpente et remplacement de la couverture", "Étanchéité de toiture-terrasse"],
  },
}

export function assertActiviteCatalogueComplet(activites: readonly { activite: string }[]): void {
  const missing = activites.filter((item) => !ACTIVITE_CATALOGUE[item.activite]).map((item) => item.activite)
  if (missing.length > 0) {
    throw new Error(`Catalogue décennale incomplet : ${missing.join(", ")}`)
  }
}
