import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logAdminActivity } from "@/lib/admin-activity"
import { getDevisAlertRecipientEmails } from "@/lib/devis-alert"
import { sendEmail } from "@/lib/email"
import { escapeHtmlForEmail } from "@/lib/email-layout"
import { checkRateLimitMemory } from "@/lib/rate-limit"
import { SITE_URL } from "@/lib/site-url"
import {
  clientSinistreStoredDate,
  formatClientSinistreDescription,
  formatEurAmount,
  parseClientSinistreDeclaration,
} from "@/lib/client-sinistre-declaration"

export const runtime = "nodejs"

function publicSinistre(row: { id: string; dateSinistre: Date; description: string | null; createdAt: Date }) {
  return {
    id: row.id,
    dateSinistre: row.dateSinistre.toISOString(),
    description: row.description,
    createdAt: row.createdAt.toISOString(),
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const sinistres = await prisma.sinistre.findMany({
      where: { userId: session.user.id },
      orderBy: { dateSinistre: "desc" },
      take: 20,
      select: { id: true, dateSinistre: true, description: true, createdAt: true },
    })

    return NextResponse.json({ sinistres: sinistres.map(publicSinistre) })
  } catch (error) {
    console.error("[client/sinistres][GET]", error)
    return NextResponse.json({ error: "Les déclarations n'ont pas pu être lues." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const limit = checkRateLimitMemory(`sinistre:${session.user.id}`, 5, 60 * 60 * 1000)
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Trop de déclarations viennent d'être envoyées. Réessayez un peu plus tard." },
        { status: 429 }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Déclaration invalide." }, { status: 400 })
    }

    const parsed = parseClientSinistreDeclaration(body)
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }
    const declaration = parsed.value

    if (declaration.contractNumber) {
      const [contract, document] = await Promise.all([
        prisma.insuranceContract.findFirst({
          where: { userId: session.user.id, contractNumber: declaration.contractNumber },
          select: { id: true },
        }),
        prisma.document.findFirst({
          where: { userId: session.user.id, numero: declaration.contractNumber },
          select: { id: true },
        }),
      ])
      if (!contract && !document) {
        return NextResponse.json(
          { error: "Ce contrat ne figure pas sur votre espace." },
          { status: 400 }
        )
      }
    }

    const description = formatClientSinistreDescription(declaration)
    const duplicate = await prisma.sinistre.findFirst({
      where: {
        userId: session.user.id,
        description,
        createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) },
      },
      select: { id: true, dateSinistre: true, description: true, createdAt: true },
    })
    if (duplicate) {
      return NextResponse.json(
        {
          error: "Cette déclaration vient d'être enregistrée.",
          sinistre: publicSinistre(duplicate),
        },
        { status: 409 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, raisonSociale: true, siret: true },
    })
    if (!user?.email) {
      return NextResponse.json({ error: "Compte introuvable." }, { status: 404 })
    }

    const created = await prisma.sinistre.create({
      data: {
        userId: session.user.id,
        dateSinistre: clientSinistreStoredDate(declaration.dateSinistre),
        description,
        montantIndemnisation: null,
      },
      select: { id: true, dateSinistre: true, description: true, createdAt: true },
    })

    const company = user.raisonSociale?.trim() || user.email
    const ficheUrl = `${SITE_URL}/gestion/clients/${session.user.id}`
    const amountLine =
      declaration.montantEstime != null ? `Montant estimé : ${formatEurAmount(declaration.montantEstime)}` : ""
    const contractLine = declaration.contractNumber ? `Contrat : ${declaration.contractNumber}` : "Contrat : non précisé"
    const alertLines = [
      `Client : ${company}`,
      `E-mail : ${user.email}`,
      user.siret ? `SIRET : ${user.siret}` : "",
      `Date du sinistre : ${declaration.dateSinistre.split("-").reverse().join("/")}`,
      contractLine,
      amountLine,
      "",
      declaration.description,
      "",
      `Ouvrir la fiche : ${ficheUrl}`,
    ].filter((line) => line !== "")

    const alertSubject = `[Optimum] Déclaration de sinistre — ${company}`
    const alertText = ["Un client a déclaré un sinistre depuis son espace.", "", ...alertLines].join("\n")
    const alertHtml = `<p style="font-weight:600;margin:0 0 12px;">Déclaration de sinistre</p>${alertLines
      .map((line) => `<p style="margin:0 0 8px;">${escapeHtmlForEmail(line) || "&nbsp;"}</p>`)
      .join("")}<p style="margin:16px 0 0;"><a href="${escapeHtmlForEmail(ficheUrl)}">Ouvrir la fiche client</a></p>`

    const alertResults = await Promise.all(
      getDevisAlertRecipientEmails().map((to) =>
        sendEmail({ to, subject: alertSubject, text: alertText, html: alertHtml }).catch(() => false)
      )
    )
    const alertSent = alertResults.some(Boolean)

    const confirmation = {
      subject: "Déclaration de sinistre reçue — Optimum Assurance",
      text: `Bonjour ${company},\n\nNous avons bien reçu votre déclaration de sinistre du ${declaration.dateSinistre.split("-").reverse().join("/")}.\n\n${contractLine}\n${amountLine ? `${amountLine}\n` : ""}\nElle est enregistrée dans votre espace client. Un conseiller la prend en charge. Cette réception ne vaut pas acceptation de garantie.\n\nCordialement,\nOptimum Assurance`,
      html: `<p>Bonjour ${escapeHtmlForEmail(company)},</p><p>Nous avons bien reçu votre déclaration de sinistre du <strong>${escapeHtmlForEmail(declaration.dateSinistre.split("-").reverse().join("/"))}</strong>.</p><p>${escapeHtmlForEmail(contractLine)}</p>${amountLine ? `<p>${escapeHtmlForEmail(amountLine)}</p>` : ""}<p>Elle est enregistrée dans votre espace client. Un conseiller la prend en charge. Cette réception ne vaut pas acceptation de garantie.</p><p>Cordialement,<br>Optimum Assurance</p>`,
    }
    const confirmationSent = await sendEmail({
      to: user.email,
      subject: confirmation.subject,
      text: confirmation.text,
      html: confirmation.html,
    }).catch(() => false)

    await logAdminActivity({
      adminEmail: user.email,
      action: "sinistre_declare_client",
      targetType: "user",
      targetId: session.user.id,
      details: {
        sinistreId: created.id,
        dateSinistre: declaration.dateSinistre,
        contractNumber: declaration.contractNumber || null,
        alertSent,
        confirmationSent,
      },
    })

    return NextResponse.json({
      ok: true,
      sinistre: publicSinistre(created),
      alertSent,
      confirmationSent,
      ...(alertSent && confirmationSent
        ? {}
        : {
            warning:
              "La déclaration est enregistrée. L'email de confirmation ou l'alerte interne n'a pas pu partir.",
          }),
    })
  } catch (error) {
    console.error("[client/sinistres][POST]", error)
    return NextResponse.json({ error: "La déclaration n'a pas pu être enregistrée." }, { status: 500 })
  }
}
