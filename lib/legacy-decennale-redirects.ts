export const LEGACY_DECENNALE_REDIRECTS = [
  { from: "plombier", to: "plomberie-sanitaire" },
  { from: "electricien", to: "electricite-generale" },
  { from: "peintre", to: "peinture-interieure" },
  { from: "carreleur", to: "carrelage" },
  { from: "macon", to: "maconnerie-generale" },
  { from: "couvreur", to: "couverture-tuiles" },
  { from: "menuisier", to: "menuiserie-exterieure" },
  { from: "charpentier", to: "charpente-bois" },
  { from: "etancheite-toiture", to: "etancheite-toiture" },
  { from: "terrassement", to: "terrassement" },
  { from: "architecte", to: "architecte" },
  { from: "maitre-d-oeuvre", to: "maitre-d-oeuvre" },
] as const

export type LegacyDecennaleSlug = (typeof LEGACY_DECENNALE_REDIRECTS)[number]["from"]
