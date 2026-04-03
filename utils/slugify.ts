/**
 * Slug URL stable (minuscules, tirets, sans accents).
 */

const ACCENT_MAP: Record<string, string> = {
  à: "a",
  â: "a",
  ä: "a",
  é: "e",
  è: "e",
  ê: "e",
  ë: "e",
  î: "i",
  ï: "i",
  ô: "o",
  ö: "o",
  ù: "u",
  û: "u",
  ü: "u",
  ÿ: "y",
  ñ: "n",
  ç: "c",
  œ: "oe",
  æ: "ae",
}

export function slugify(input: string, maxLength = 120): string {
  let s = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/gi, "oe")
    .replace(/æ/gi, "ae")
  for (const [k, v] of Object.entries(ACCENT_MAP)) {
    s = s.replace(new RegExp(k, "gi"), v)
  }
  s = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  if (s.length > maxLength) s = s.slice(0, maxLength).replace(/-+$/g, "")
  return s || "x"
}

export function buildAiSlug(kind: "decennale" | "do", metierOrType: string, ville: string): string {
  return `ai:${kind}:${slugify(metierOrType)}:${slugify(ville)}`
}
