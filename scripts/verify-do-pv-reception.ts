import { readFileSync } from "node:fs"
import {
  generatePvReceptionVierge,
  PV_RECEPTION_VIERGE_FILENAME,
} from "../lib/pdf/do/generatePvReceptionVierge"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

async function main() {
const bytes = await generatePvReceptionVierge()
assert(bytes.byteLength > 1000, "le modèle vierge est un PDF")
assert(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46, "le fichier commence par %PDF")
assert(PV_RECEPTION_VIERGE_FILENAME === "pv-reception-vierge.pdf", "le nom du fichier est stable")

const generator = readFileSync(new URL("../lib/pdf/do/generatePvReceptionVierge.ts", import.meta.url), "utf8")
const route = readFileSync(new URL("../app/api/client/do-pv-reception/route.ts", import.meta.url), "utf8")
const page = readFileSync(new URL("../app/espace-client/page.tsx", import.meta.url), "utf8")

assert(generator.includes("Procès-verbal de réception"), "le titre du modèle est le procès-verbal")
assert(generator.includes("Modèle vierge"), "le document est présenté comme un modèle vierge")
assert(generator.includes("1792-6"), "le modèle rappelle la réception de l'article 1792-6")
assert(generator.includes("Aucune information du dossier n'est préremplie."), "aucune donnée de dossier n'est annoncée comme remplie")
assert(!generator.includes("clientName"), "le générateur ne reçoit pas le nom du client")
assert(!generator.includes("prisma"), "le générateur ne lit pas la base")

assert(route.includes("productType: \"do\""), "le téléchargement est réservé au dommage ouvrage")
assert(route.includes("Non authentifié"), "un visiteur non connecté ne télécharge pas le modèle")
assert(route.includes("generatePvReceptionVierge()"), "la route sert le modèle vierge")
assert(!route.includes("clientName"), "la route n'imprime pas le nom du client")

const linkAt = page.indexOf('href="/api/client/do-pv-reception"')
assert(linkAt > 0, "l'espace client propose le téléchargement")
assert(
  page.lastIndexOf('c.productType === "do"', linkAt) > linkAt - 400,
  "le lien n'apparaît que sur un dossier dommage ouvrage"
)
assert(page.includes("modèle vierge"), "le bouton annonce un modèle vierge")

console.log("PV de réception vierge : OK")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
