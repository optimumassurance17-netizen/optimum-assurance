/**
 * Données de seed : métiers, types DO, villes France (slugs stables).
 * Étendre `VILLES_FR` pour dépasser 1000 pages (métiers × villes).
 */

export type MetierSeed = {
  nom: string
  slug: string
  description: string
  risques: string
  prix_moyen: number
}

export type TypeProjetSeed = {
  nom: string
  slug: string
  description: string
}

export type VilleSeed = {
  nom: string
  slug: string
  population: number
}

/** 10 métiers BTP représentatifs */
export const METIERS_SEED: MetierSeed[] = [
  {
    nom: "Plombier",
    slug: "plombier",
    description:
      "Installation et réparation des réseaux d’eau et d’évacuation sur chantiers neufs et rénovation.",
    risques: "Fuites, désordres sur canalisations encastrées, dommages aux parties communes.",
    prix_moyen: 920,
  },
  {
    nom: "Électricien",
    slug: "electricien",
    description:
      "Mise aux normes, tableaux, éclairage et courants faibles pour le bâtiment résidentiel et tertiaire.",
    risques: "Défauts d’isolation, surintensités, désordres sur ouvrages électriques.",
    prix_moyen: 880,
  },
  {
    nom: "Peintre",
    slug: "peintre",
    description: "Peinture intérieure et extérieure, préparation des supports et finitions sur chantiers.",
    risques: "Adhérence, fissures esthétiques impactant la réception des travaux.",
    prix_moyen: 720,
  },
  {
    nom: "Carreleur",
    slug: "carreleur",
    description: "Pose de carrelage, faïence et pierre naturelle dans les locaux à usage d’habitation.",
    risques: "Désordres de pose, infiltrations liées à l’étanchéité des ouvrages.",
    prix_moyen: 780,
  },
  {
    nom: "Maçon",
    slug: "macon",
    description: "Gros œuvre, maçonnerie, fondations et ouvrages porteurs pour la construction neuve.",
    risques: "Tassements, fissures structurelles, désordres affectant la solidité de l’ouvrage.",
    prix_moyen: 1200,
  },
  {
    nom: "Couvreur",
    slug: "couvreur",
    description: "Couverture, étanchéité toiture, zinguerie et travaux en hauteur sur bâtiments.",
    risques: "Infiltrations, désordres de charpente et d’étanchéité.",
    prix_moyen: 1050,
  },
  {
    nom: "Menuisier",
    slug: "menuisier",
    description: "Pose de menuiseries intérieures et extérieures, portes, fenêtres et cloisons.",
    risques: "Infiltrations périphériques, désordres de fixation et d’étanchéité.",
    prix_moyen: 860,
  },
  {
    nom: "Charpentier",
    slug: "charpentier",
    description: "Charpente bois ou métallique, assemblages structurels et points d’appui.",
    risques: "Désordres de structure, flèches, liaisons mécaniques.",
    prix_moyen: 1150,
  },
  {
    nom: "Étancheur",
    slug: "etancheur",
    description: "Étanchéité terrasses, toitures-terrasses et ouvrages complexes.",
    risques: "Infiltrations, remontées capillaires, désordres d’interface.",
    prix_moyen: 980,
  },
  {
    nom: "Terrassier",
    slug: "terrassier",
    description: "Terrassement, réseaux enterrés, préparation de plateformes et VRD.",
    risques: "Tassements différentiels, désordres de réseaux et d’interfaces de fondation.",
    prix_moyen: 1100,
  },
]

export const TYPES_PROJETS_SEED: TypeProjetSeed[] = [
  {
    nom: "Particulier faisant construire",
    slug: "particulier",
    description:
      "Maître d’ouvrage particulier pour une maison individuelle ou jumelée avec permis de construire.",
  },
  {
    nom: "Auto-construction",
    slug: "auto-construction",
    description: "Particulier qui coordonne lui-même les corps d’état pour son propre compte.",
  },
  {
    nom: "Constructeur et promoteur",
    slug: "constructeur-promoteur",
    description: "Promotion immobilière, programmes neufs et vente en l’état futur d’achèvement.",
  },
  {
    nom: "Garantie clos et couvert",
    slug: "clos-et-couvert",
    description: "Périmètre de garantie limité aux lots structure pour réduire la prime.",
  },
]

/** 20 villes initiales + extension pour atteindre 100+ combinaisons (noms réels). */
const VILLES_BASE: VilleSeed[] = [
  { nom: "Paris", slug: "paris", population: 2_161_000 },
  { nom: "Marseille", slug: "marseille", population: 870_000 },
  { nom: "Lyon", slug: "lyon", population: 522_000 },
  { nom: "Toulouse", slug: "toulouse", population: 493_000 },
  { nom: "Nice", slug: "nice", population: 343_000 },
  { nom: "Nantes", slug: "nantes", population: 314_000 },
  { nom: "Montpellier", slug: "montpellier", population: 285_000 },
  { nom: "Strasbourg", slug: "strasbourg", population: 287_000 },
  { nom: "Bordeaux", slug: "bordeaux", population: 260_000 },
  { nom: "Lille", slug: "lille", population: 233_000 },
  { nom: "Rennes", slug: "rennes", population: 222_000 },
  { nom: "Reims", slug: "reims", population: 182_000 },
  { nom: "Le Havre", slug: "le-havre", population: 170_000 },
  { nom: "Saint-Étienne", slug: "saint-etienne", population: 172_000 },
  { nom: "Toulon", slug: "toulon", population: 176_000 },
  { nom: "Grenoble", slug: "grenoble", population: 158_000 },
  { nom: "Dijon", slug: "dijon", population: 156_000 },
  { nom: "Angers", slug: "angers", population: 154_000 },
  { nom: "Nîmes", slug: "nimes", population: 151_000 },
  { nom: "Villeurbanne", slug: "villeurbanne", population: 154_000 },
]

const VILLES_EXTRA: VilleSeed[] = [
  { nom: "Clermont-Ferrand", slug: "clermont-ferrand", population: 147_000 },
  { nom: "Le Mans", slug: "le-mans", population: 145_000 },
  { nom: "Aix-en-Provence", slug: "aix-en-provence", population: 145_000 },
  { nom: "Brest", slug: "brest", population: 139_000 },
  { nom: "Tours", slug: "tours", population: 137_000 },
  { nom: "Amiens", slug: "amiens", population: 133_000 },
  { nom: "Limoges", slug: "limoges", population: 132_000 },
  { nom: "Annecy", slug: "annecy", population: 131_000 },
  { nom: "Perpignan", slug: "perpignan", population: 121_000 },
  { nom: "Besançon", slug: "besancon", population: 118_000 },
  { nom: "Metz", slug: "metz", population: 117_000 },
  { nom: "Orléans", slug: "orleans", population: 116_000 },
  { nom: "Rouen", slug: "rouen", population: 111_000 },
  { nom: "Mulhouse", slug: "mulhouse", population: 109_000 },
  { nom: "Caen", slug: "caen", population: 106_000 },
  { nom: "Nancy", slug: "nancy", population: 104_000 },
  { nom: "Argenteuil", slug: "argenteuil", population: 110_000 },
  { nom: "Montreuil", slug: "montreuil", population: 111_000 },
  { nom: "Saint-Denis", slug: "saint-denis", population: 112_000 },
  { nom: "Roubaix", slug: "roubaix", population: 99_000 },
  { nom: "Tourcoing", slug: "tourcoing", population: 99_000 },
  { nom: "Nanterre", slug: "nanterre", population: 94_000 },
  { nom: "Avignon", slug: "avignon", population: 91_000 },
  { nom: "Créteil", slug: "creteil", population: 92_000 },
  { nom: "Dunkerque", slug: "dunkerque", population: 86_000 },
  { nom: "Poitiers", slug: "poitiers", population: 89_000 },
  { nom: "Asnières-sur-Seine", slug: "asnieres-sur-seine", population: 86_000 },
  { nom: "Versailles", slug: "versailles", population: 85_000 },
  { nom: "Courbevoie", slug: "courbevoie", population: 82_000 },
  { nom: "Colombes", slug: "colombes", population: 85_000 },
  { nom: "Vitry-sur-Seine", slug: "vitry-sur-seine", population: 95_000 },
  { nom: "Aulnay-sous-Bois", slug: "aulnay-sous-bois", population: 86_000 },
  { nom: "La Rochelle", slug: "la-rochelle", population: 77_000 },
  { nom: "Champigny-sur-Marne", slug: "champigny-sur-marne", population: 77_000 },
  { nom: "Rueil-Malmaison", slug: "rueil-malmaison", population: 78_000 },
  { nom: "Antibes", slug: "antibes", population: 75_000 },
  { nom: "Saint-Maur-des-Fossés", slug: "saint-maur-des-fosses", population: 75_000 },
  { nom: "Cannes", slug: "cannes", population: 74_000 },
  { nom: "Calais", slug: "calais", population: 73_000 },
  { nom: "Béziers", slug: "beziers", population: 75_000 },
  { nom: "Mérignac", slug: "merignac", population: 73_000 },
  { nom: "Drancy", slug: "drancy", population: 72_000 },
  { nom: "Saint-Nazaire", slug: "saint-nazaire", population: 72_000 },
  { nom: "Colmar", slug: "colmar", population: 70_000 },
  { nom: "Issy-les-Moulineaux", slug: "issy-les-moulineaux", population: 68_000 },
  { nom: "Noisy-le-Grand", slug: "noisy-le-grand", population: 69_000 },
  { nom: "Évry-Courcouronnes", slug: "evry-courcouronnes", population: 67_000 },
  { nom: "Cergy", slug: "cergy", population: 66_000 },
  { nom: "Pessac", slug: "pessac", population: 65_000 },
  { nom: "Valence", slug: "valence", population: 64_000 },
  { nom: "Quimper", slug: "quimper", population: 63_000 },
  { nom: "La Seyne-sur-Mer", slug: "la-seyne-sur-mer", population: 62_000 },
  { nom: "Antony", slug: "antony", population: 62_000 },
  { nom: "Troyes", slug: "troyes", population: 61_000 },
  { nom: "Neuilly-sur-Seine", slug: "neuilly-sur-seine", population: 60_000 },
  { nom: "Montpellier Métropole", slug: "montpellier-metropole", population: 465_000 },
  { nom: "Boulogne-Billancourt", slug: "boulogne-billancourt", population: 117_000 },
  { nom: "Levallois-Perret", slug: "levallois-perret", population: 64_000 },
  { nom: "Clamart", slug: "clamart", population: 53_000 },
  { nom: "Sarcelles", slug: "sarcelles", population: 59_000 },
  { nom: "Niort", slug: "niort", population: 59_000 },
  { nom: "Chambéry", slug: "chambery", population: 59_000 },
  { nom: "Lorient", slug: "lorient", population: 57_000 },
  { nom: "Beauvais", slug: "beauvais", population: 57_000 },
  { nom: "Meaux", slug: "meaux", population: 57_000 },
  { nom: "Bayonne", slug: "bayonne", population: 52_000 },
  { nom: "Hyères", slug: "hyeres", population: 56_000 },
  { nom: "Pau", slug: "pau", population: 77_000 },
  { nom: "Fréjus", slug: "frejus", population: 54_000 },
  { nom: "La Courneuve", slug: "la-courneuve", population: 45_000 },
  { nom: "Saint-Quentin", slug: "saint-quentin", population: 54_000 },
  { nom: "Arles", slug: "arles", population: 51_000 },
  { nom: "Laval", slug: "laval", population: 50_000 },
  { nom: "Martigues", slug: "martigues", population: 48_000 },
  { nom: "Sète", slug: "sete", population: 44_000 },
  { nom: "Albi", slug: "albi", population: 49_000 },
  { nom: "Bourges", slug: "bourges", population: 64_000 },
  { nom: "Blois", slug: "blois", population: 46_000 },
  { nom: "Ajaccio", slug: "ajaccio", population: 71_000 },
  { nom: "Bastia", slug: "bastia", population: 44_000 },
  { nom: "Charleville-Mézières", slug: "charleville-mezieres", population: 46_000 },
  { nom: "Belfort", slug: "belfort", population: 46_000 },
  { nom: "Évreux", slug: "evreux", population: 47_000 },
  { nom: "Châteauroux", slug: "chateauroux", population: 43_000 },
  { nom: "Tarbes", slug: "tarbes", population: 44_000 },
  { nom: "Alès", slug: "ales", population: 43_000 },
  { nom: "Saint-Brieuc", slug: "saint-brieuc", population: 45_000 },
  { nom: "Cherbourg", slug: "cherbourg", population: 79_000 },
  { nom: "Angoulême", slug: "angouleme", population: 42_000 },
  { nom: "Roanne", slug: "roanne", population: 34_000 },
  { nom: "Annemasse", slug: "annemasse", population: 36_000 },
  { nom: "Thionville", slug: "thionville", population: 41_000 },
  { nom: "Arras", slug: "arras", population: 42_000 },
  { nom: "Douai", slug: "douai", population: 40_000 },
  { nom: "Lens", slug: "lens", population: 32_000 },
  { nom: "Cannes La Bocca", slug: "cannes-la-bocca", population: 22_000 },
]

/** Liste fusionnée dédoublonnée par slug (≈120 villes). */
export const VILLES_FR: VilleSeed[] = dedupeVilles([...VILLES_BASE, ...VILLES_EXTRA])

function dedupeVilles(rows: VilleSeed[]): VilleSeed[] {
  const m = new Map<string, VilleSeed>()
  for (const v of rows) {
    if (!m.has(v.slug)) m.set(v.slug, v)
  }
  return [...m.values()]
}
