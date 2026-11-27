import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { calculerTarifDommageOuvrage } from "../lib/tarification-dommage-ouvrage"

function primeAttendue(baseFournie: number): number {
  const apresBaisse = Math.round(baseFournie * 0.7)
  const remise = Math.round(apresBaisse * 0.05)
  return apresBaisse - remise
}

const paliers: { cout: number; base: number; tranche: string }[] = [
  { cout: 50_000, base: 1900, tranche: "0 k€ à 100 k€" },
  { cout: 99_999, base: 1900, tranche: "0 k€ à 100 k€" },
  { cout: 100_000, base: 2700, tranche: "100 k€ à 150 k€" },
  { cout: 149_999, base: 2700, tranche: "100 k€ à 150 k€" },
  { cout: 150_000, base: 3200, tranche: "150 k€ à 250 k€" },
  { cout: 249_999, base: 3200, tranche: "150 k€ à 250 k€" },
  { cout: 250_000, base: 4200, tranche: "250 k€ à 500 k€" },
  { cout: 499_999, base: 4200, tranche: "250 k€ à 500 k€" },
]

for (const palier of paliers) {
  const tarif = calculerTarifDommageOuvrage(palier.cout)
  assert.equal(tarif?.primeAnnuelle, primeAttendue(palier.base), `prime pour ${palier.cout}`)
  assert.equal(tarif?.tranche, palier.tranche, `tranche pour ${palier.cout}`)
  assert.equal(tarif?.remiseWeb, Math.round(Math.round(palier.base * 0.7) * 0.05))
}

const haut = calculerTarifDommageOuvrage(600_000)
const baseHaut = Math.round(600_000 * 0.017 * 0.7)
const remiseHaut = Math.round(baseHaut * 0.05)
assert.equal(haut?.primeAnnuelle, baseHaut - remiseHaut)
assert.equal(haut?.tranche, "> 500 k€ (1,19 %)")

const avecOptions = calculerTarifDommageOuvrage(100_000, { garanties: ["do", "trc", "rcmo"] })
assert.equal(avecOptions?.supplementTrc, Math.round(100_000 * 0.004))
assert.equal(avecOptions?.supplementRcmo, Math.round(100_000 * 0.002))
assert.equal(
  avecOptions?.primeAnnuelle,
  primeAttendue(2700) + (avecOptions?.supplementTrc ?? 0) + (avecOptions?.supplementRcmo ?? 0)
)

assert.equal(calculerTarifDommageOuvrage(0), null)
assert.equal(calculerTarifDommageOuvrage(-1), null)

const source = readFileSync("lib/tarification-dommage-ouvrage.ts", "utf8")
assert(source.includes("BAISSE_PALIERS_DO = 0.3"), "la baisse de 30 % est explicite")
assert(source.includes("prix: 1900"), "le palier fourni de 1 900 € reste la référence")
assert(source.includes("prix: 2700"), "le palier fourni de 2 700 € reste la référence")
assert(source.includes("prix: 3200"), "le palier fourni de 3 200 € reste la référence")
assert(source.includes("prix: 4200"), "le palier fourni de 4 200 € reste la référence")
assert(source.includes("0.017"), "le taux fourni de 1,7 % reste la référence")

console.log("verify-tarif-do: ok")
