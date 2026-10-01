const BRAND = "Optimum Assurance"

/**
 * Titre HTML unique. Le layout ajoute déjà « | Optimum Assurance » :
 * un titre qui contient déjà la marque est figé pour ne pas la répéter.
 */
export function absoluteBrandTitle(title: string): { absolute: string } {
  const core = title
    .replace(/\s*\|\s*Optimum Assurance\s*$/i, "")
    .replace(/\s*\|\s*Optimum\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
  return { absolute: `${core} | ${BRAND}` }
}
