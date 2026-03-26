/**
 * Validation IBAN (ISO 13616 / MOD 97-10).
 * @see https://www.iso13616.org/
 */

/** Longueurs attendues par code pays (les plus courants en zone SEPA). */
const IBAN_LENGTH_BY_COUNTRY: Partial<Record<string, number>> = {
  AD: 24,
  AT: 20,
  BE: 16,
  BG: 22,
  CH: 21,
  CY: 28,
  CZ: 24,
  DE: 22,
  DK: 18,
  EE: 20,
  ES: 24,
  FI: 18,
  FR: 27,
  GB: 22,
  GI: 23,
  GR: 27,
  HR: 21,
  HU: 28,
  IE: 22,
  IS: 26,
  IT: 27,
  LI: 21,
  LT: 20,
  LU: 20,
  LV: 21,
  MC: 27,
  MT: 31,
  NL: 18,
  NO: 15,
  PL: 28,
  PT: 25,
  RO: 24,
  SE: 24,
  SI: 19,
  SK: 24,
  SM: 27,
  VA: 22,
}

export function normalizeIban(iban: string): string {
  return iban.replace(/\s+/g, "").toUpperCase()
}

/**
 * Contrôle MOD 97-10 sur l’IBAN normalisé (sans espaces).
 */
function mod97Valid(iban: string): boolean {
  if (iban.length < 15 || iban.length > 34) return false
  const rearranged = iban.slice(4) + iban.slice(0, 4)
  let expanded = ""
  for (let i = 0; i < rearranged.length; i++) {
    const c = rearranged[i]
    const code = c.charCodeAt(0)
    if (c >= "0" && c <= "9") {
      expanded += c
    } else if (c >= "A" && c <= "Z") {
      expanded += String(code - 55)
    } else {
      return false
    }
  }
  let remainder = 0
  for (let i = 0; i < expanded.length; i++) {
    remainder = (remainder * 10 + parseInt(expanded[i]!, 10)) % 97
  }
  return remainder === 1
}

export function isValidIban(input: string): boolean {
  const iban = normalizeIban(input)
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(iban)) return false
  if (iban.length < 15 || iban.length > 34) return false

  const country = iban.slice(0, 2)
  const expected = IBAN_LENGTH_BY_COUNTRY[country]
  if (expected !== undefined && iban.length !== expected) {
    return false
  }

  return mod97Valid(iban)
}

/**
 * Message d’erreur lisible, ou `null` si l’IBAN est valide.
 */
export function getIbanValidationMessage(input: string): string | null {
  const iban = normalizeIban(input)
  if (!iban) {
    return "Veuillez saisir votre IBAN."
  }
  if (!/^[A-Z]{2}/.test(iban)) {
    return "L’IBAN doit commencer par le code pays (2 lettres), par ex. FR pour la France."
  }
  if (!/^[A-Z]{2}[0-9]{2}/.test(iban)) {
    return "Après le code pays, l’IBAN doit contenir 2 chiffres de contrôle."
  }
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(iban)) {
    return "L’IBAN ne doit contenir que des lettres et des chiffres (sans caractères spéciaux)."
  }
  if (iban.length < 15) {
    return "IBAN trop court : vérifiez que vous avez saisi toutes les positions."
  }
  if (iban.length > 34) {
    return "IBAN trop long : vérifiez qu’il n’y a pas de doublon ou d’espace en trop."
  }

  const country = iban.slice(0, 2)
  const expected = IBAN_LENGTH_BY_COUNTRY[country]
  if (expected !== undefined && iban.length !== expected) {
    return `Pour un compte ${country}, l’IBAN doit comporter ${expected} caractères (vous en avez ${iban.length}).`
  }

  if (!mod97Valid(iban)) {
    return "Clé IBAN incorrecte : vérifiez chaque chiffre (erreur fréquente : une lettre ou un chiffre mal saisi)."
  }

  return null
}
