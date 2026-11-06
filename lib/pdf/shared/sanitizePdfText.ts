/**
 * pdf-lib + polices Standard (WinAnsi / windows-1252) : rejettent souvent les espaces
 * insécables (U+202F, U+00A0) produits par `toLocaleString("fr-FR")`, ainsi que
 * guillemets et apostrophes typographiques.
 *
 * Le « œ » (U+0153) et le « Œ » (U+0152) ne sont pas dans Latin-1, mais Helvetica
 * les encode. Les remplacer par un espace transformait « œuvre » en « uvre »
 * sur les devis, contrats et attestations.
 */
const WIN1252_EXTRA = new Set<number>([
  0x0152, // Œ
  0x0153, // œ
  0x0160, // Š
  0x0161, // š
  0x0178, // Ÿ
  0x017d, // Ž
  0x017e, // ž
  0x0192, // ƒ
  0x02c6, // ˆ
  0x02dc, // ˜
  0x2020, // †
  0x2021, // ‡
  0x2022, // •
  0x2030, // ‰
  0x2039, // ‹
  0x203a, // ›
  0x20ac, // €
  0x2122, // ™
])

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
    } else if (WIN1252_EXTRA.has(c)) {
      out += s[i]
    } else {
      out += " "
    }
  }
  return out.replace(/\s{2,}/g, " ")
}
