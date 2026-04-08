import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"
import { sendNewDevisRequestAlert } from "@/lib/devis-alert"
import { getClientIp, checkRateLimitMemory } from "@/lib/rate-limit"
import type { DevisRcFabriquantData, RcTypeProduit, RcZoneDistribution } from "@/lib/rc-fabriquant-types"
import { computeRcFabIndicatif } from "@/lib/rc-fabriquant-underwriting"

export const runtime = "nodejs"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const TYPE_PRODUIT_SET = new Set<RcTypeProduit>([
  "alimentaire",
  "industriel",
  "cosmetique",
  "electronique",
  "batterie",
])

const ZONE_SET = new Set<RcZoneDistribution>(["France", "Europe", "Monde"])

function parseBool(v: unknown): boolean {
  return v === true || v === "true" || v === 1
}

function sanitizePayload(body: unknown): { email: string; data: DevisRcFabriquantData } | null {
  if (!body || typeof body !== "object") return null
  const o = body as Record<string, unknown>
  const email = typeof o.email === "string" ? o.email.trim().toLowerCase() : ""
  if (!email || !EMAIL_RE.test(email)) return null
  const raw = o.data
  if (!raw || typeof raw !== "object") return null
  const d = raw as Record<string, unknown>

  const raisonSociale = typeof d.raisonSociale === "string" ? d.raisonSociale.trim() : ""
  const siretRaw = typeof d.siret === "string" ? d.siret.replace(/\s/g, "").trim() : ""
  const telephone = typeof d.telephone === "string" ? d.telephone.trim() : ""
  const activiteFabrication =
    typeof d.activiteFabrication === "string" ? d.activiteFabrication.trim() : ""

  if (!raisonSociale || !telephone || !activiteFabrication) return null
  if (!/^\d{14}$/.test(siretRaw)) return null

  const typeRaw = d.typeProduit
  const typeProduit =
    typeof typeRaw === "string" && TYPE_PRODUIT_SET.has(typeRaw as RcTypeProduit)
      ? (typeRaw as RcTypeProduit)
      : undefined
  const zoneRaw = d.zoneDistribution
  const zoneDistribution =
    typeof zoneRaw === "string" && ZONE_SET.has(zoneRaw as RcZoneDistribution)
      ? (zoneRaw as RcZoneDistribution)
      : undefined

  if (!typeProduit || !zoneDistribution) return null

  const caAnnuelTotal =
    typeof d.caAnnuelTotal === "number" && Number.isFinite(d.caAnnuelTotal) ? d.caAnnuelTotal : NaN
  if (!Number.isFinite(caAnnuelTotal) || caAnnuelTotal <= 0) return null

  const anneeCreation =
    typeof d.anneeCreation === "number" && Number.isFinite(d.anneeCreation)
      ? Math.floor(d.anneeCreation)
      : undefined

  const caExport =
    typeof d.caExport === "number" && Number.isFinite(d.caExport) && d.caExport >= 0
      ? d.caExport
      : undefined

  const sinistres5Ans =
    typeof d.sinistres5Ans === "number" && Number.isFinite(d.sinistres5Ans) && d.sinistres5Ans >= 0
      ? Math.floor(d.sinistres5Ans)
      : undefined

  const montantSinistres =
    typeof d.montantSinistres === "number" &&
    Number.isFinite(d.montantSinistres) &&
    d.montantSinistres >= 0
      ? d.montantSinistres
      : undefined

  const effectifs = typeof d.effectifs === "string" ? d.effectifs.trim() : undefined
  const zonesCommercialisation =
    typeof d.zonesCommercialisation === "string" ? d.zonesCommercialisation.trim() : undefined
  const message = typeof d.message === "string" ? d.message.trim().slice(0, 4000) : undefined

  const data: DevisRcFabriquantData = {
    raisonSociale,
    siret: siretRaw,
    telephone,
    activiteFabrication,
    typeProduit,
    zoneDistribution,
    sousTraitance: parseBool(d.sousTraitance),
    controleQualite: parseBool(d.controleQualite),
    certification: parseBool(d.certification),
    testsSecurite: parseBool(d.testsSecurite),
    caAnnuelTotal,
    ...(anneeCreation != null && anneeCreation > 1800 ? { anneeCreation } : {}),
    ...(caExport != null ? { caExport } : {}),
    ...(sinistres5Ans != null ? { sinistres5Ans } : {}),
    ...(montantSinistres != null ? { montantSinistres } : {}),
    ...(effectifs ? { effectifs } : {}),
    ...(zonesCommercialisation ? { zonesCommercialisation } : {}),
    ...(message ? { message } : {}),
  }

  return { email, data }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const { ok, retryAfterSec } = checkRateLimitMemory(`devis-rc-fab:${ip}`, 5, 60_000)
  if (!ok) {
    return NextResponse.json(
      { error: "Trop de demandes. Réessayez dans une minute." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 })
  }

  const parsed = sanitizePayload(body)
  if (!parsed) {
    return NextResponse.json(
      {
        error:
          "Données invalides : vérifiez l’e-mail, la raison sociale, le SIRET (14 chiffres), le téléphone, l’activité, le type de produit, la zone de distribution et le CA annuel.",
      },
      { status: 400 }
    )
  }

  const { email, data } = parsed
  const caTotal = data.caAnnuelTotal!
  const indicatif = computeRcFabIndicatif(data)
  const storedPayload = {
    ...data,
    ...(indicatif ? { _indicatifUnderwriting: indicatif } : {}),
  }

  try {
    await prisma.devisRcFabriquantLead.create({
      data: {
        email,
        data: JSON.stringify(storedPayload),
      },
    })
  } catch (e) {
    console.error("[devis-rc-fabriquant] prisma:", e)
    return NextResponse.json({ error: "Enregistrement impossible" }, { status: 500 })
  }

  const lines: string[] = [
    `Raison sociale : ${data.raisonSociale}`,
    `Téléphone : ${data.telephone}`,
    `SIRET : ${data.siret}`,
    `Activité / produits : ${data.activiteFabrication}`,
    `Type de produit : ${data.typeProduit}`,
    `Zone de distribution : ${data.zoneDistribution}`,
    `Sous-traitance : ${data.sousTraitance ? "oui" : "non"}`,
    `Contrôle qualité : ${data.controleQualite ? "oui" : "non"}`,
    ...(data.typeProduit === "batterie" || data.typeProduit === "electronique"
      ? [
          `Certification CE / normes : ${data.certification ? "oui" : "non"}`,
          `Tests thermiques / sécurité : ${data.testsSecurite ? "oui" : "non"}`,
        ]
      : []),
    `CA annuel total : ${caTotal.toLocaleString("fr-FR")} €`,
  ]
  if (data.caExport != null) lines.push(`CA export : ${data.caExport.toLocaleString("fr-FR")} €`)
  if (data.anneeCreation != null) lines.push(`Année de création : ${data.anneeCreation}`)
  if (data.effectifs) lines.push(`Effectifs : ${data.effectifs}`)
  if (data.zonesCommercialisation) lines.push(`Précision zones : ${data.zonesCommercialisation}`)
  if (data.sinistres5Ans != null) lines.push(`Sinistres (5 ans) : ${data.sinistres5Ans}`)
  if (data.montantSinistres != null) {
    lines.push(`Montant sinistres déclaré : ${data.montantSinistres.toLocaleString("fr-FR")} €`)
  }
  if (data.message) lines.push(`Message : ${data.message}`)

  if (indicatif) {
    lines.push(
      `— Indicatif interne — Score : ${indicatif.score} | Refus automatique : non (validation humaine)`
    )
    if (indicatif.motifRefusIndicatif) lines.push(`Motif indicatif : ${indicatif.motifRefusIndicatif}`)
    if (indicatif.primeIndicative) {
      lines.push(
        `Prime TTC indicative : ${indicatif.primeIndicative.primeTtc.toLocaleString("fr-FR")} € (${indicatif.primeIndicative.tauxLabel})`
      )
    }
  }

  try {
    await sendNewDevisRequestAlert({
      type: "rc_fabriquant",
      clientEmail: email,
      lines,
    })
  } catch (e) {
    console.error("[devis-rc-fabriquant] alerte interne:", e)
  }

  try {
    const tpl = EMAIL_TEMPLATES.demandeRcFabriquantRecue(data.raisonSociale)
    await sendEmail({
      to: email,
      subject: tpl.subject,
      text: tpl.text,
      html: tpl.html,
    })
  } catch (e) {
    console.error("[devis-rc-fabriquant] email prospect:", e)
  }

  return NextResponse.json({ ok: true })
}
