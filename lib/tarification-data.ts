/**
 * Tarification décennale - 110 activités Optimum Assurance
 * Source : tarification_decennale_110_activites_optimum_assurance.pdf
 * Structure : taux_base (% du CA), prime_min (€/an)
 * Stratégie : ~30% sous le marché + réduction 10% par tranche de 100k€ de CA
 */

export interface TarifActivite {
  activite: string
  categorie: string
  taux_base: number // % du CA (ex: 2.8 = 2.8%)
  prime_min: number // €/an
}

export const TARIFICATION_110_ACTIVITES: TarifActivite[] = [
  { activite: "Maçonnerie générale", categorie: "Gros œuvre", taux_base: 2.8, prime_min: 1200 },
  { activite: "Béton armé", categorie: "Gros œuvre", taux_base: 2.9, prime_min: 1200 },
  { activite: "Coffrage", categorie: "Gros œuvre", taux_base: 2.7, prime_min: 1100 },
  { activite: "Ferraillage", categorie: "Gros œuvre", taux_base: 2.7, prime_min: 1100 },
  { activite: "Construction maison individuelle", categorie: "Gros œuvre", taux_base: 3.0, prime_min: 1300 },
  { activite: "Charpente bois", categorie: "Structure", taux_base: 2.45, prime_min: 1100 },
  { activite: "Charpente métallique", categorie: "Structure", taux_base: 2.45, prime_min: 1100 },
  { activite: "Charpente lamellé-collé", categorie: "Structure", taux_base: 2.5, prime_min: 1100 },
  { activite: "Couverture tuiles", categorie: "Toiture", taux_base: 2.45, prime_min: 1100 },
  { activite: "Couverture ardoises", categorie: "Toiture", taux_base: 2.45, prime_min: 1100 },
  { activite: "Couverture zinc", categorie: "Toiture", taux_base: 2.5, prime_min: 1100 },
  { activite: "Couverture bac acier", categorie: "Toiture", taux_base: 2.4, prime_min: 1100 },
  { activite: "Zinguerie", categorie: "Toiture", taux_base: 2.4, prime_min: 1100 },
  { activite: "Étanchéité toiture", categorie: "Toiture", taux_base: 3.15, prime_min: 1300 },
  { activite: "Étanchéité terrasse", categorie: "Toiture", taux_base: 3.15, prime_min: 1300 },
  { activite: "Bardage", categorie: "Façade", taux_base: 2.3, prime_min: 1000 },
  { activite: "Façade ravalement", categorie: "Façade", taux_base: 2.3, prime_min: 1000 },
  { activite: "Isolation thermique extérieure", categorie: "Isolation", taux_base: 2.2, prime_min: 950 },
  { activite: "Isolation intérieure", categorie: "Isolation", taux_base: 2.1, prime_min: 900 },
  { activite: "Électricité générale", categorie: "Technique", taux_base: 1.54, prime_min: 850 },
  { activite: "Courants faibles", categorie: "Technique", taux_base: 1.4, prime_min: 800 },
  { activite: "Domotique", categorie: "Technique", taux_base: 1.35, prime_min: 800 },
  { activite: "Photovoltaïque", categorie: "Technique", taux_base: 1.9, prime_min: 900 },
  { activite: "Bornes recharge", categorie: "Technique", taux_base: 1.4, prime_min: 800 },
  { activite: "Plomberie sanitaire", categorie: "Technique", taux_base: 1.82, prime_min: 900 },
  { activite: "Chauffage central", categorie: "Technique", taux_base: 1.82, prime_min: 900 },
  { activite: "Chauffage gaz", categorie: "Technique", taux_base: 1.75, prime_min: 900 },
  { activite: "Pompe à chaleur", categorie: "Technique", taux_base: 1.9, prime_min: 900 },
  { activite: "Climatisation", categorie: "Technique", taux_base: 1.75, prime_min: 900 },
  { activite: "Ventilation", categorie: "Technique", taux_base: 1.5, prime_min: 850 },
  { activite: "VMC simple flux", categorie: "Technique", taux_base: 1.4, prime_min: 850 },
  { activite: "VMC double flux", categorie: "Technique", taux_base: 1.5, prime_min: 850 },
  { activite: "Génie climatique", categorie: "Technique", taux_base: 1.9, prime_min: 950 },
  { activite: "Réseaux hydrauliques", categorie: "Technique", taux_base: 1.7, prime_min: 900 },
  { activite: "Réseaux gaz", categorie: "Technique", taux_base: 1.8, prime_min: 900 },
  { activite: "Plâtrerie", categorie: "Finition", taux_base: 1.54, prime_min: 850 },
  { activite: "Plaques de plâtre", categorie: "Finition", taux_base: 1.54, prime_min: 850 },
  { activite: "Staff stuc", categorie: "Finition", taux_base: 1.4, prime_min: 800 },
  { activite: "Faux plafonds", categorie: "Finition", taux_base: 1.4, prime_min: 800 },
  { activite: "Cloisons sèches", categorie: "Finition", taux_base: 1.45, prime_min: 800 },
  { activite: "Menuiserie intérieure", categorie: "Finition", taux_base: 1.54, prime_min: 850 },
  { activite: "Menuiserie extérieure", categorie: "Finition", taux_base: 1.6, prime_min: 900 },
  { activite: "Pose fenêtres", categorie: "Finition", taux_base: 1.6, prime_min: 900 },
  { activite: "Pose portes", categorie: "Finition", taux_base: 1.5, prime_min: 850 },
  { activite: "Serrurerie", categorie: "Finition", taux_base: 1.5, prime_min: 850 },
  { activite: "Métallerie", categorie: "Finition", taux_base: 1.6, prime_min: 900 },
  { activite: "Garde-corps", categorie: "Finition", taux_base: 1.5, prime_min: 850 },
  { activite: "Carrelage", categorie: "Finition", taux_base: 1.75, prime_min: 900 },
  { activite: "Faïence", categorie: "Finition", taux_base: 1.7, prime_min: 900 },
  { activite: "Sol souple", categorie: "Finition", taux_base: 1.5, prime_min: 850 },
  { activite: "Parquet", categorie: "Finition", taux_base: 1.5, prime_min: 850 },
  { activite: "Moquette", categorie: "Finition", taux_base: 1.4, prime_min: 800 },
  { activite: "Peinture intérieure", categorie: "Finition", taux_base: 1.12, prime_min: 750 },
  { activite: "Peinture extérieure", categorie: "Finition", taux_base: 1.2, prime_min: 750 },
  { activite: "Revêtement mural", categorie: "Finition", taux_base: 1.2, prime_min: 750 },
  { activite: "Terrassement", categorie: "Extérieur", taux_base: 2.0, prime_min: 950 },
  { activite: "VRD", categorie: "Extérieur", taux_base: 2.2, prime_min: 1000 },
  { activite: "Assainissement", categorie: "Extérieur", taux_base: 2.1, prime_min: 950 },
  { activite: "Canalisations", categorie: "Extérieur", taux_base: 2.0, prime_min: 950 },
  { activite: "Aménagement extérieur", categorie: "Extérieur", taux_base: 1.8, prime_min: 900 },
  { activite: "Pose pavés", categorie: "Extérieur", taux_base: 1.7, prime_min: 900 },
  { activite: "Pose dalles", categorie: "Extérieur", taux_base: 1.7, prime_min: 900 },
  { activite: "Terrasses", categorie: "Extérieur", taux_base: 1.8, prime_min: 900 },
  { activite: "Piscine béton", categorie: "Extérieur", taux_base: 2.4, prime_min: 1100 },
  { activite: "Piscine coque", categorie: "Extérieur", taux_base: 2.2, prime_min: 1000 },
  { activite: "Piscine kit", categorie: "Extérieur", taux_base: 2.0, prime_min: 950 },
  { activite: "Clôtures", categorie: "Extérieur", taux_base: 1.6, prime_min: 850 },
  { activite: "Portails", categorie: "Extérieur", taux_base: 1.6, prime_min: 850 },
  { activite: "Paysagisme maçonnerie", categorie: "Extérieur", taux_base: 1.9, prime_min: 900 },
  { activite: "Ossature bois", categorie: "Structure", taux_base: 2.2, prime_min: 1000 },
  { activite: "Construction modulaire", categorie: "Structure", taux_base: 2.0, prime_min: 1000 },
  { activite: "Structure métallique", categorie: "Structure", taux_base: 2.1, prime_min: 1000 },
  { activite: "Béton préfabriqué", categorie: "Structure", taux_base: 2.2, prime_min: 1000 },
  { activite: "Isolation phonique", categorie: "Isolation", taux_base: 1.6, prime_min: 850 },
  { activite: "Protection incendie", categorie: "Spécialisé", taux_base: 1.7, prime_min: 900 },
  { activite: "Traitement façade", categorie: "Spécialisé", taux_base: 1.8, prime_min: 900 },
  { activite: "Désamiantage", categorie: "Spécialisé", taux_base: 3.0, prime_min: 1300 },
  { activite: "Démolition", categorie: "Spécialisé", taux_base: 2.3, prime_min: 1000 },
  { activite: "Sciage béton", categorie: "Spécialisé", taux_base: 2.1, prime_min: 950 },
  { activite: "Fondation spéciale", categorie: "Spécialisé", taux_base: 2.6, prime_min: 1200 },
  { activite: "Forage", categorie: "Spécialisé", taux_base: 2.1, prime_min: 950 },
  // Taux appliqué au calcul : 2.4% à 3.5% selon risque (voir lib/tarification.ts)
  { activite: "Forage micropieux", categorie: "Spécialisé", taux_base: 2.4, prime_min: 1300 },
  { activite: "Injection résine", categorie: "Spécialisé", taux_base: 2.0, prime_min: 950 },
  { activite: "Traitement bois", categorie: "Spécialisé", taux_base: 1.7, prime_min: 900 },
  { activite: "Traitement humidité", categorie: "Spécialisé", taux_base: 1.7, prime_min: 900 },
  { activite: "Rénovation énergétique", categorie: "Spécialisé", taux_base: 1.8, prime_min: 900 },
  { activite: "Rénovation TCE", categorie: "Divers", taux_base: 2.0, prime_min: 1000 },
  { activite: "Contractant général", categorie: "Divers", taux_base: 2.2, prime_min: 1100 },
  { activite: "Entreprise générale bâtiment", categorie: "Divers", taux_base: 2.2, prime_min: 1100 },
  { activite: "Maintenance bâtiment", categorie: "Divers", taux_base: 1.4, prime_min: 800 },
  { activite: "Maintenance chauffage", categorie: "Divers", taux_base: 1.5, prime_min: 850 },
  { activite: "Maintenance climatisation", categorie: "Divers", taux_base: 1.5, prime_min: 850 },
  { activite: "Maintenance plomberie", categorie: "Divers", taux_base: 1.5, prime_min: 850 },
  { activite: "Architecte", categorie: "PIB", taux_base: 1.6, prime_min: 900 },
  { activite: "Architecte intérieur", categorie: "PIB", taux_base: 2.3, prime_min: 1000 },
  { activite: "Maître d'œuvre", categorie: "PIB", taux_base: 1.4, prime_min: 850 },
  { activite: "Bureau études techniques", categorie: "PIB", taux_base: 1.26, prime_min: 850 },
  { activite: "Ingénieur structure", categorie: "PIB", taux_base: 1.4, prime_min: 850 },
  { activite: "Ingénieur fluides", categorie: "PIB", taux_base: 1.3, prime_min: 850 },
  { activite: "Thermicien", categorie: "PIB", taux_base: 1.2, prime_min: 800 },
  { activite: "Géotechnicien", categorie: "PIB", taux_base: 1.5, prime_min: 900 },
  { activite: "Économiste construction", categorie: "PIB", taux_base: 0.98, prime_min: 750 },
  { activite: "Programmiste bâtiment", categorie: "PIB", taux_base: 1.0, prime_min: 750 },
  { activite: "OPC", categorie: "PIB", taux_base: 0.84, prime_min: 750 },
  { activite: "Audit technique bâtiment", categorie: "PIB", taux_base: 1.0, prime_min: 750 },
  { activite: "Assistance maîtrise d'ouvrage", categorie: "PIB", taux_base: 1.0, prime_min: 750 },
  { activite: "Coordination SPS", categorie: "PIB", taux_base: 1.1, prime_min: 800 },
  { activite: "Diagnostic technique immobilier", categorie: "PIB", taux_base: 1.1, prime_min: 800 },
  { activite: "Conseil énergétique bâtiment", categorie: "PIB", taux_base: 1.0, prime_min: 750 },
  { activite: "Expert bâtiment", categorie: "PIB", taux_base: 1.1, prime_min: 800 },
  { activite: "Ingénierie environnementale bâtiment", categorie: "PIB", taux_base: 1.1, prime_min: 800 },
  { activite: "Programmation immobilière", categorie: "PIB", taux_base: 1.0, prime_min: 750 },
  { activite: "Études acoustiques", categorie: "PIB", taux_base: 1.1, prime_min: 800 },
]

/** Alias pour matcher les anciennes activités du formulaire */
const ALIAS_ACTIVITES: Record<string, string> = {
  "maçonnerie": "Maçonnerie générale",
  "gros œuvre": "Construction maison individuelle",
  "charpente": "Charpente bois",
  "couverture": "Couverture tuiles",
  "plomberie": "Plomberie sanitaire",
  "électricité": "Électricité générale",
  "carrelage": "Carrelage",
  "peinture": "Peinture intérieure",
  "peinture en bâtiment": "Peinture intérieure",
  "menuiserie": "Menuiserie intérieure",
  "terrassement": "Terrassement",
  "démolition": "Démolition",
  "étanchéité": "Étanchéité toiture",
  "étanchéité toiture": "Étanchéité toiture",
  "fondation speciale": "Fondation spéciale",
  "fondations speciales": "Fondation spéciale",
  "forage micropieux": "Forage micropieux",
  "forage de micropieux": "Forage micropieux",
  "micropieux": "Forage micropieux",
  "façade": "Façade ravalement",
  "ravalement": "Façade ravalement",
  "plâtrerie": "Plâtrerie",
  "parquet": "Parquet",
  "isolation": "Isolation thermique extérieure",
  "chauffage": "Chauffage central",
  "climatisation": "Climatisation",
  "assainissement": "Assainissement",
  "métallerie": "Métallerie",
  "architecte": "Architecte",
  "architecte interieur": "Architecte intérieur",
  "architecte d'interieur": "Architecte intérieur",
  "architecture d'interieur": "Architecte intérieur",
  "maître d'œuvre": "Maître d'œuvre",
  "économiste de la construction": "Économiste construction",
  "coordinateur sps": "Coordination SPS",
  "diagnostiqueur immobilier": "Diagnostic technique immobilier",
  "géomètre": "Géotechnicien",
  "expert en construction": "Expert bâtiment",
  "ingénieur structure": "Ingénieur structure",
  "ingénieur fluides": "Ingénieur fluides",
  "bet structure": "Bureau études techniques",
  "bet fluides": "Bureau études techniques",
  "bet thermique": "Bureau études techniques",
  "bet géotechnique": "Bureau études techniques",
  "bet acoustique": "Études acoustiques",
  "bet électricité": "Électricité générale",
  "bet vrd": "VRD",
  "bet façades": "Façade ravalement",
  "bet béton armé": "Béton armé",
  "bet charpente métallique": "Charpente métallique",
  "bet bois": "Charpente bois",
  "bet environnement": "Ingénierie environnementale bâtiment",
  "bet sécurité incendie": "Protection incendie",
  "bet cvc": "Génie climatique",
  "bet assainissement": "Assainissement",
  "bet coordination": "Coordination SPS",
  "bet économie de la construction": "Économiste construction",
  "bet structure métallique": "Structure métallique",
  "bet géomètre": "Géotechnicien",
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['']/g, "'")
}

export function getTarifActivite(activite: string): TarifActivite | null {
  const n = normalize(activite)
  const alias = ALIAS_ACTIVITES[n]
  const search = alias || activite.trim()
  const found = TARIFICATION_110_ACTIVITES.find(
    (t) => normalize(t.activite) === normalize(search)
  )
  if (found) return found
  const partial = TARIFICATION_110_ACTIVITES.find((t) =>
    normalize(t.activite).includes(n) || n.includes(normalize(t.activite))
  )
  return partial ?? null
}

export const TARIF_DEFAULT: TarifActivite = {
  activite: "Default",
  categorie: "Divers",
  taux_base: 2.0,
  prime_min: 900,
}
