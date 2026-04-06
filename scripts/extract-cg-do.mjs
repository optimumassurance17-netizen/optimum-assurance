#!/usr/bin/env node
/**
 * Extrait le texte d'un PDF des CG DO, applique les remplacements Optimum / Accelerant,
 * et écrit lib/cg-dommage-ouvrage-full.txt
 *
 * Usage : node scripts/extract-cg-do.mjs "chemin/vers/CG_DO.pdf"
 */
import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

/** require() évite le bug pdf-parse en ESM (!module.parent → exécution de test au chargement). */
const require = createRequire(import.meta.url)
const pdf = require("pdf-parse")

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")

const pdfPath = process.env.CG_DO_PDF_PATH || process.argv[2]
if (!pdfPath || !fs.existsSync(pdfPath)) {
  console.error("Usage: CG_DO_PDF_PATH=chemin.pdf node scripts/extract-cg-do.mjs")
  console.error("   ou: node scripts/extract-cg-do.mjs <fichier.pdf>")
  process.exit(1)
}

const buf = fs.readFileSync(pdfPath)
const { text: raw } = await pdf(buf)

let text = raw

const DISTRIBUTION_BLOCK = `Assureur : Accelerant Insurance. Distribution : Optimum Courtage, immatriculé à l'ORIAS sous le numéro LPS 28931947, 14 rue Amboise, 49300 Cholet, France — contact@optimum-assurance.fr — soumis au contrôle de l'Autorité de contrôle prudentiel et de résolution (ACPR).`

const replacements = [
  [/MARSH\s+INSURANCE/gi, "Accelerant Insurance"],
  [/Marsh\s+Insurance/gi, "Accelerant Insurance"],
  [/Marsh\s+SA/gi, "Accelerant Insurance"],
  /** Ancienne faute de frappe dans des exports / brouillons */
  [/Axcelrant\s+Insurance/gi, "Accelerant Insurance"],
  [/www\.marsh-insurance\.eu/gi, ""],
  [/marsh-insurance\.eu/gi, ""],
  [/MARSH INSURANCE\s*,?\s*Marsh SA est une société anonyme par actions, enregistrée en Belgique sous le numéro\s*d'entreprise 0403\.276\.906 et dont le siège social est situé Avenue Herrmann-Debroux 2, B-1160 Bruxelles, Belgique\.\s*Marsh SA fait partie du groupe Marsh McLennan[^.]*\.\s*Soumise au contrôle de l'Autorité de Contrôle\s*Prudentiel et de Résolution[^.]*\.\s*site web\s*:\s*www\.marsh-insurance\.eu/gi, DISTRIBUTION_BLOCK],
  [/do@marsh-insurance\.fr/gi, "contact@optimum-assurance.fr"],
  [/dpo@marsh-insurance\.fr/gi, "contact@optimum-assurance.fr"],
  [/Par courrier\s*:\s*Marsh Insurance\s*Service réclamation\s*Avenue Herrmann-Debroux 2, B-1160 Bruxelles, Belgique/gi, "Par courrier : Optimum Courtage — Service réclamations — 14 rue Amboise, 49300 Cholet, France"],
  [/Avenue Herrmann-Debroux 2,?\s*B-1160 Bruxelles,?\s*Belgique/gi, "14 rue Amboise, 49300 Cholet, France"],
  [/--\s*\d+\s+of\s+\d+\s+--/g, ""],
  [/\n{3,}/g, "\n\n"],
]

for (const [re, rep] of replacements) {
  text = text.replace(re, rep)
}

const header = `CONDITIONS GÉNÉRALES — DOMMAGES-OUVRAGE (CG DO)
Version adaptée pour la distribution par Optimum Courtage (ORIAS LPS 28931947) — Assureur : Accelerant Insurance.
Document généré à partir du modèle contractuel fourni ; les mentions de l'ancien distributeur ont été remplacées.
Les conditions particulières et le questionnaire d'étude prévalent en cas de contradiction.

Note franchise — garantie obligatoire DO : lorsque les conditions particulières prévoient une franchise nulle, aucune retenue à la charge de l'assuré ne s'applique au titre de cette garantie (sous réserve des stipulations contractuelles définitives).

---

`

const outPath = path.join(root, "lib", "cg-dommage-ouvrage-full.txt")
fs.writeFileSync(outPath, header + text.trim() + "\n", "utf8")
console.log("Écrit :", outPath, "(" + fs.statSync(outPath).size + " octets)")
