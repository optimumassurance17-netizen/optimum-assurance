import { readFileSync } from "node:fs"
import {
  DO_DEVIS_LEADS_SECTION_ID,
  doDevisLeadGestionUrl,
  doDevisLeadRowId,
  doLeadMatchesSearch,
  readDoLeadCompanyName,
  selectDoDevisDashboardActions,
} from "../lib/devis-do-lead"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const company = readDoLeadCompanyName(
  JSON.stringify({ raisonSociale: "  SCA   Démo  ", typeOuvrage: "immeuble_logements" })
)
assert(company === "SCA Démo", "la raison sociale est nettoyée")
assert(readDoLeadCompanyName("pas du json") === null, "un JSON invalide ne donne pas de société")
assert(readDoLeadCompanyName(JSON.stringify({ raisonSociale: "   " })) === null, "une société vide reste vide")
assert(
  readDoLeadCompanyName(JSON.stringify({ raisonSociale: "A".repeat(200) }))?.length === 160,
  "la raison sociale est limitée à 160 caractères"
)

const lead = { email: "prospect@example.com", raisonSociale: "SCA Démo" }
assert(doLeadMatchesSearch(lead, ""), "une recherche vide garde la demande")
assert(doLeadMatchesSearch(lead, "PROSPECT"), "la recherche retrouve l'e-mail")
assert(doLeadMatchesSearch(lead, "demo"), "la recherche ignore les accents")
assert(!doLeadMatchesSearch(lead, "autre-societe"), "une autre société ne correspond pas")

const now = new Date("2026-10-09T16:00:00.000Z")
const recentId = "cldo00000000000000000001"
const olderId = "cldo00000000000000000002"
const knownId = "cldo00000000000000000003"
const lateId = "cldo00000000000000000099"
const actions = selectDoDevisDashboardActions(
  [
    {
      id: olderId,
      email: "ancien@example.com",
      data: JSON.stringify({ raisonSociale: "Ancien" }),
      createdAt: new Date("2026-10-08T16:00:00.000Z"),
    },
    {
      id: recentId,
      email: "prospect@example.com",
      data: JSON.stringify({ raisonSociale: "SCA Démo" }),
      createdAt: new Date("2026-10-09T15:30:00.000Z"),
    },
    {
      id: knownId,
      email: "deja@example.com",
      data: JSON.stringify({ raisonSociale: "Déjà client" }),
      createdAt: new Date("2026-10-09T12:00:00.000Z"),
    },
    {
      id: "cldo00000000000000000004",
      email: "   ",
      data: JSON.stringify({ raisonSociale: "Sans email" }),
      createdAt: new Date("2026-10-09T12:00:00.000Z"),
    },
    {
      id: lateId,
      email: "vieux@example.com",
      data: JSON.stringify({ raisonSociale: "Trop ancien" }),
      createdAt: new Date("2026-10-01T15:00:00.000Z"),
    },
    {
      id: "cldo00000000000000000080",
      email: "attente@example.com",
      data: JSON.stringify({ raisonSociale: "En attente" }),
      createdAt: new Date(now.getTime() - 80 * 60 * 60 * 1000),
    },
    ...Array.from({ length: 5 }, (_, index) => ({
      id: `cldo0000000000000000001${index}`,
      email: `extra${index}@example.com`,
      data: JSON.stringify({ raisonSociale: `Extra ${index}` }),
      createdAt: new Date(now.getTime() - (index + 2) * 60 * 60 * 1000),
    })),
  ],
  new Set(["deja@example.com"]),
  now
)

assert(actions[0]?.id === `lead-do-${recentId}`, "la demande la plus récente est en tête")
assert(actions[0]?.description === "SCA Démo — prospect@example.com", "l'action nomme la société et l'e-mail")
assert(actions[0]?.href === `#${doDevisLeadRowId(recentId)}`, "l'action pointe vers la ligne")
assert(actions[0]?.kind === "do_devis_pending", "l'action est une demande devis DO")
assert(actions[0]?.priority === "medium", "une demande du jour n'est pas marquée urgente")
assert(actions.some((action) => action.id === `lead-do-${olderId}`), "une demande de la semaine reste visible")
assert(!actions.some((action) => action.description.includes("Déjà client")), "une fiche déjà ouverte n'est pas une action")
assert(!actions.some((action) => action.description.includes("Trop ancien")), "une demande de plus de 7 jours n'est pas une action")
assert(!actions.some((action) => action.description.includes("Sans email")), "une demande sans e-mail est ignorée")
assert(actions.length === 8, "la liste d'actions reste plafonnée")
assert(
  actions.some((action) => action.priority === "high" && action.ageHours >= 72),
  "une demande de plus de 72 heures passe en priorité haute"
)

assert(
  doDevisLeadGestionUrl("https://www.optimum-assurance.fr/", recentId) ===
    `https://www.optimum-assurance.fr/gestion#demande-do-${recentId}`,
  "le mail pointe vers la ligne de la demande"
)
assert(
  doDevisLeadGestionUrl("https://www.optimum-assurance.fr", "mauvais id") ===
    `https://www.optimum-assurance.fr/gestion#${DO_DEVIS_LEADS_SECTION_ID}`,
  "un identifiant illisible retombe sur le bloc"
)

const alert = readFileSync(new URL("../lib/devis-alert.ts", import.meta.url), "utf8")
const route = readFileSync(new URL("../app/api/devis-dommage-ouvrage/route.ts", import.meta.url), "utf8")
const dashboard = readFileSync(new URL("../app/api/gestion/dashboard/route.ts", import.meta.url), "utf8")
const page = readFileSync(new URL("../app/gestion/page.tsx", import.meta.url), "utf8")
const search = readFileSync(new URL("../app/api/gestion/clients/search/route.ts", import.meta.url), "utf8")
const quickSearch = readFileSync(new URL("../components/gestion/ClientQuickSearch.tsx", import.meta.url), "utf8")

assert(alert.includes("doDevisLeadGestionUrl"), "l'alerte construit le lien de gestion")
assert(alert.includes('params.type === "dommage_ouvrage"'), "le lien de gestion est réservé au devis DO")
assert(alert.includes("Ouvrir la demande dans la gestion"), "l'alerte affiche le lien vers la demande")
assert(alert.includes("return [DEFAULT_PUBLIC_CONTACT_EMAIL]"), "l'alerte reste sur info@")
assert(route.includes("gestionLeadId: lead.id"), "la demande enregistrée transmet son identifiant à l'alerte")
assert(!route.includes("user.create"), "enregistrer un devis DO ne crée pas de fiche")

assert(dashboard.includes("selectDoDevisDashboardActions"), "le tableau de bord prépare les actions devis DO")
assert(
  dashboard.includes("[...doDevisActionsVisible, ...dashboardActionsVisible]"),
  "les demandes DO restent en tête des actions du jour"
)
assert(!dashboard.includes("sendClientAccessEmail"), "ouvrir le tableau de bord n'envoie pas d'accès client")
assert(!dashboard.includes("create-from-lead"), "ouvrir le tableau de bord ne crée pas de fiche")

assert(page.includes("Société"), "le tableau affiche la société")
assert(page.includes("doLeadMatchesSearch"), "la recherche de la page inclut les demandes DO")
assert(page.includes("DO_DEVIS_LEADS_SECTION_ID"), "le bloc des demandes a une ancre")
assert(page.includes('handleCreateLeadAccount(d.id, "dommage_ouvrage")'), "la fiche se crée encore par le bouton")
assert(page.includes("do_devis_pending"), "l'action du jour ouvre la ligne sans créer de compte")
assert(page.includes("Demandes DO"), "un accès rapide mène au bloc")

assert(search.includes("doLeadMatchesSearch"), "la recherche rapide retrouve les demandes")
assert(search.includes("devisDoLeads"), "la recherche rapide renvoie les demandes à part des fiches")
assert(!search.includes("user.create"), "la recherche ne crée pas de fiche")
assert(quickSearch.includes("Demande devis"), "la recherche rapide distingue la demande d'une fiche")
assert(quickSearch.includes('lead.href.startsWith("/gestion#")'), "la recherche rapide n'ouvre pas une fausse fiche")

console.log("Demandes devis DO : OK")
