/**
 * pdf-lib + polices Standard (WinAnsi) : rejettent souvent les espaces insécables (U+202F, U+00A0)
 * produits par `toLocaleString("fr-FR")`, ainsi que guillemets / apostrophes typographiques.
 */
export function sanitizeForPdfLib(text: string): string {
  if (!text) return ""
  const s = text
    .normalize("NFC")
    .replace(/[\u202F\u00A0\u2007\u2009\u200A\u00AD]/g, " ")
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"')
    .replace(/[\u2013\u2014\u2015\u2212]/g, "-")
    .replace(/\u2026/g, "...")

  let out = ""
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c === 9 || c === 10 || c === 13) {
      out += " "
    } else if (c >= 32 && c <= 126) {
      out += s[i]
    } else if (c >= 160 && c <= 255) {
      out += s[i]
    } else {
      out += " "
    }
  }
  return out.replace(/\s{2,}/g, " ")
}
