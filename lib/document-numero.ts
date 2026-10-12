/** Prochain numéro d'après le plus grand suffixe, pas d'après le document le plus récent. */
export function nextSerialNumero(prefix: string, numeros: string[]): string {
  let max = 0
  for (const numero of numeros) {
    if (!numero.startsWith(prefix)) continue
    const suffix = numero.slice(prefix.length)
    if (!/^\d+$/.test(suffix)) continue
    const parsed = parseInt(suffix, 10)
    if (parsed > max) max = parsed
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`
}
