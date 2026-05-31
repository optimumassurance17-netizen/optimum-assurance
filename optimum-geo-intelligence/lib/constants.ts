export const OGI_COMPETITOR_SEEDS = [
  { name: "AXA Construction", domain: "www.axa.fr" },
  { name: "April", domain: "www.april.fr" },
  { name: "SMA BTP", domain: "www.smabtp.fr" },
  { name: "Entoria", domain: "www.entoria.com" },
  { name: "QBE", domain: "www.qbeeurope.com" },
  { name: "Verspieren", domain: "www.verspieren.com" },
] as const

export const OGI_GEO_QUERY_SEEDS = [
  "meilleure assurance décennale",
  "assurance décennale artisan",
  "assurance décennale auto entrepreneur",
  "assurance décennale bâtiment",
  "courtier assurance décennale",
  "assurance décennale pas chère",
] as const

export const OGI_CITY_SEEDS = [
  "Paris",
  "Marseille",
  "Lyon",
  "Toulouse",
  "Bordeaux",
  "Nantes",
  "Lille",
  "Strasbourg",
  "Nice",
  "Montpellier",
] as const

export const OGI_PROFESSION_SEEDS = [
  "plombier",
  "électricien",
  "maçon",
  "couvreur",
  "carreleur",
  "peintre",
  "menuisier",
  "chauffagiste",
  "artisan btp",
] as const

export const OGI_AI_PROVIDERS = ["chatgpt", "gemini", "claude", "perplexity"] as const

export const OGI_CRON_SCHEDULE = {
  competitor: "0 3 * * *",
  geo: "30 3 * * *",
  content: "0 4 * * *",
  optimizer: "30 4 * * *",
  alerts: "0 5 * * *",
  snapshot: "30 5 * * *",
} as const

export const OGI_DEFAULT_INTERNAL_LINKS = [
  "/devis",
  "/devis-assurance-decennale-en-ligne",
  "/guides/obligation-decennale",
  "/guides/resiliation-decennale",
  "/contact",
]

export const OGI_BRAND_TERMS = [
  "optimum assurance",
  "optimumassurance",
  "optimum assurance décennale",
]

export const OGI_SCAN_MAX_PAGES = 150
