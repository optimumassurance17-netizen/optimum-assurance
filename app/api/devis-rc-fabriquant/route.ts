import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"
import { sendNewDevisRequestAlert } from "@/lib/devis-alert"
import { getClientIp, checkRateLimitMemory } from "@/lib/rate-limit"
import type { DevisRcFabriquantData } from "@/lib/rc-fabriquant-types"

export const runtime = "nodejs"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function sanitizePayload(body: unknown): { email: string; data: DevisRcFabriquantData } | null {
  if (!body || typeof body !== "object") return null
  const o = body as Record<string, unknown>
  const email = typeof o.email === "string" ? o.email.trim().toLowerCase() : ""
  if (!email || !EMAIL_RE.test(email)) return null
  const raw = o.data
  if (!raw || typeof raw !== "object") return null
  const d = raw as Record<string, unknown>
  const raisonSociale = typeof d.raisonSociale === "string" ? d.raisonSociale.trim() : ""
  const telephone = typeof d.telephone === "string" ? d.telephone.trim() : ""
  const activiteFabrication =
    typeof d.activiteFabrication === "string" ? d.activiteFabrication.trim() : ""
  if (!raisonSociale || !telephone || !activiteFabrication) return null

  const siret = typeof d.siret === "string" ? d.siret.replace(/\s/g, "").trim() : undefined
  const chiffreAffairesAnnuel =
    typeof d.chiffreAffairesAnnuel === "number" && Number.isFinite(d.chiffreAffairesAnnuel)
      ? d.chiffreAffairesAnnuel
      : undefined
  const effectifs = typeof d.effectifs === "string" ? d.effectifs.trim() : undefined
  const zonesCommercialisation =
    typeof d.zonesCommercialisation === "string" ? d.zonesCommercialisation.trim() : undefined
  const message = typeof d.message === "string" ? d.message.trim().slice(0, 4000) : undefined

  const data: DevisRcFabriquantData = {
    raisonSociale,
    telephone,
    activiteFabrication,
    ...(siret ? { siret } : {}),
    ...(chiffreAffairesAnnuel != null && chiffreAffairesAnnuel >= 0
      ? { chiffreAffairesAnnuel }
      : {}),
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
      { error: "Données invalides : email, raison sociale, téléphone et activité de fabrication sont requis." },
      { status: 400 }
    )
  }

  const { email, data } = parsed

  try {
    await prisma.devisRcFabriquantLead.create({
      data: {
        email,
        data: JSON.stringify(data),
      },
    })
  } catch (e) {
    console.error("[devis-rc-fabriquant] prisma:", e)
    return NextResponse.json({ error: "Enregistrement impossible" }, { status: 500 })
  }

  const lines: string[] = [
    `Raison sociale : ${data.raisonSociale}`,
    `Téléphone : ${data.telephone}`,
    ...(data.siret ? [`SIRET : ${data.siret}`] : []),
    `Activité / produits fabriqués : ${data.activiteFabrication}`,
  ]
  if (data.chiffreAffairesAnnuel != null) {
    lines.push(`CA annuel estimé : ${data.chiffreAffairesAnnuel.toLocaleString("fr-FR")} €`)
  }
  if (data.effectifs) lines.push(`Effectifs : ${data.effectifs}`)
  if (data.zonesCommercialisation) lines.push(`Zones de commercialisation : ${data.zonesCommercialisation}`)
  if (data.message) lines.push(`Message : ${data.message}`)

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
