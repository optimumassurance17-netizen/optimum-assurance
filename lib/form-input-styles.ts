/**
 * Styles de champs formulaire : texte noir forcé (y compris valeurs préremplies API / autofill).
 */
export const inputTextDark =
  "!text-[#000000] !placeholder:text-[#333333] placeholder:opacity-100 caret-black [color-scheme:light]"

/** Champ sur fond gris clair (#e4e4e4) — bordure + focus */
export const inputFieldBg =
  "border border-[#d4d4d4] rounded-xl bg-[#e4e4e4] focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] outline-none"

/**
 * Texte secondaire sur fond clair : gris foncé (#333), lisible sur mobile (évite #525252 / #737373 trop pâles).
 */
export const textSecondaryOnLight = "text-[#333333]"
