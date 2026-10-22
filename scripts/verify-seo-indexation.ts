import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { ACTIVITE_CATALOGUE } from "../lib/decennale-activites-catalogue"
import { DO_SEO } from "../lib/dommage-ouvrage-seo"
import { METIERS_SEO } from "../lib/metiers-seo"
import {
  listIndexableProgrammaticSitemapPaths,
  resolveDecennaleCityIndex,
  resolveDoCityIndex,
} from "../lib/seo-programmatic/indexability"
import { fetchProgrammaticSitemapUrls, getDecennaleLocalPage, getDoLocalPage } from "../lib/seo-programmatic/queries"
import { buildStaticSitemapEntries } from "../lib/sitemap/build-sitemap-entries"
import { renderUrlset } from "../lib/sitemap/xml"

delete process.env.NEXT_PUBLIC_SUPABASE_URL
delete process.env.SUPABASE_SERVICE_ROLE_KEY
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const gscDecennale = [
  ["couverture-bac-acier", "paris"],
  ["bardage", "grenoble"],
  ["charpente-lamelle-colle", "montpellier"],
  ["opc", "toulouse"],
  ["menuiserie-exterieure", "lyon"],
] as const

for (const [metier, ville] of gscDecennale) {
  const decision = resolveDecennaleCityIndex(metier, ville)
  assert.equal(decision.index, false, `${metier}/${ville} ne doit pas être indexée`)
  assert.equal(decision.follow, true)
  assert.equal(decision.canonicalPath, `/assurance-decennale/${metier}`)
}

for (const [slug, ville] of [
  ["constructeur-promoteur", "toulouse"],
  ["clos-et-couvert", "paris"],
  ["particulier", "lille"],
  ["auto-construction", "nantes"],
] as const) {
  const decision = resolveDoCityIndex(slug, ville)
  assert.equal(decision.index, false, `${slug}/${ville} ne doit pas être indexée`)
  assert.equal(decision.canonicalPath, `/dommage-ouvrage/${slug}`)
}

for (const metier of METIERS_SEO) {
  for (const ville of ["paris", "lyon", "grenoble"]) {
    const decision = resolveDecennaleCityIndex(metier.slug, ville)
    assert.equal(decision.index, false)
    assert.equal(decision.canonicalPath, `/assurance-decennale/${metier.slug}`)
  }
}

for (const entry of METIERS_SEO) {
  if (entry.kind !== "activity") continue
  assert.ok(ACTIVITE_CATALOGUE[entry.activite], `fiche catalogue manquante : ${entry.activite}`)
}

for (const profile of DO_SEO) {
  const decision = resolveDoCityIndex(profile.slug, "marseille")
  assert.equal(decision.index, false)
  assert.equal(decision.canonicalPath, `/dommage-ouvrage/${profile.slug}`)
}

async function main() {
const programmatic = await fetchProgrammaticSitemapUrls()
assert.deepEqual(programmatic, [])
assert.deepEqual(listIndexableProgrammaticSitemapPaths(), [])
assert.equal(renderUrlset([]).includes("/assurance-decennale/"), false)
assert.equal(renderUrlset([]).includes("<urlset"), true)

const staticPaths = buildStaticSitemapEntries().map((entry) => new URL(entry.url).pathname)
for (const required of [
  "/assurance-decennale",
  "/assurance-decennale/activites",
  "/assurance-decennale/couverture-bac-acier",
  "/assurance-decennale/bardage",
  "/assurance-decennale/opc",
  "/dommage-ouvrage",
  "/dommage-ouvrage/constructeur-promoteur",
  "/devis",
  "/devis-dommage-ouvrage",
  "/devis-assurance-decennale-en-ligne",
  "/etude",
  "/etude/domaine",
]) {
  assert.ok(staticPaths.includes(required), `sitemap statique sans ${required}`)
}

assert.equal(
  staticPaths.some((path) => path.startsWith("/assurance-decennale/") && path.split("/").length > 3),
  false,
  "le sitemap statique ne doit pas contenir de page ville décennale"
)
assert.equal(
  staticPaths.some((path) => path.startsWith("/dommage-ouvrage/") && path.split("/").length > 3),
  false,
  "le sitemap statique ne doit pas contenir de page ville dommage ouvrage"
)

assert.equal(await getDecennaleLocalPage("metier-inexistant", "paris"), null)
assert.equal(await getDecennaleLocalPage("macon", "commune-inconnue"), null)
assert.equal(await getDoLocalPage("profil-inexistant", "paris"), null)

const cityPage = readFileSync("app/assurance-decennale/[metier]/[ville]/page.tsx", "utf8")
const doCityPage = readFileSync("app/dommage-ouvrage/[slug]/[ville]/page.tsx", "utf8")
const metierPage = readFileSync("app/assurance-decennale/[metier]/page.tsx", "utf8")
const etudePage = readFileSync("app/etude/page.tsx", "utf8")
const programmaticRoute = readFileSync("app/sitemap-programmatic.xml/route.ts", "utf8")
const expert = readFileSync("lib/decennale-activity-expert-content.ts", "utf8")

assert.match(cityPage, /resolveDecennaleCityIndex/)
assert.match(cityPage, /index: decision\.index/)
assert.match(cityPage, /Activités assurables|Page de référence/)
assert.doesNotMatch(cityPage, /canonical: `\$\{baseUrl\}\$\{path\}`/)
assert.match(doCityPage, /resolveDoCityIndex/)
assert.match(metierPage, /ACTIVITE_CATALOGUE/)
assert.match(metierPage, /Limites et exclusions de cette activité/)
assert.match(metierPage, /Ce qui fait varier le tarif/)
assert.doesNotMatch(expert, /\/\$\{city\.slug\}/)
assert.doesNotMatch(etudePage, /"use client"/)
assert.match(etudePage, /Demande d’étude décennale/)
assert.match(etudePage, /ne vaut ni acceptation/)
assert.doesNotMatch(programmaticRoute, /plombier\/paris/)

console.log("Indexation SEO : vérifications OK")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
