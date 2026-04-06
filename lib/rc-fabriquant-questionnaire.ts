/**
 * Structure du questionnaire RC Fabriquant (titres d’étapes — aligné cahier des charges interne).
 */
export const RC_FABRIQUANT_STEPS = [
  { id: 1, title: "Informations entreprise" },
  { id: 2, title: "Activité fabricant" },
  { id: 3, title: "Chiffre d’affaires" },
  { id: 4, title: "Sinistralité et envoi" },
] as const

export const RC_TYPE_PRODUIT_OPTIONS = [
  { value: "alimentaire", label: "Alimentaire" },
  { value: "industriel", label: "Industriel" },
  { value: "cosmetique", label: "Cosmétique" },
  { value: "electronique", label: "Électronique" },
  { value: "batterie", label: "Batterie" },
] as const

export const RC_ZONE_DISTRIBUTION_OPTIONS = [
  { value: "France", label: "France" },
  { value: "Europe", label: "Europe" },
  { value: "Monde", label: "Monde" },
] as const
