import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createMollieClient } from "@mollie/api-client"
import { randomBytes } from "crypto"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { asJsonObject } from "@/lib/json-object"
import { getNextNumero } from "@/lib/documents"
import { resolveUserActivitiesHierarchy } from "@/lib/activity-hierarchy"

function generateVerificationToken(): string {
  return randomBytes(16).toString("hex")
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = asJsonObject<{ type?: string; data?: unknown; numero?: string; paymentId?: string }>(
      await request.json()
    )
    const { type, data, numero: customNumero } = body

    if (!type || !["devis", "contrat", "attestation"].includes(type)) {
      return NextResponse.json({ error: "Type invalide" }, { status: 400 })
    }

    if (type === "attestation") {
      const paymentId = typeof body?.paymentId === "string" ? body.paymentId.trim() : ""
      if (!/^tr_[A-Za-z0-9]+$/.test(paymentId)) {
        return NextResponse.json(
          { error: "paymentId Mollie requis pour créer une attestation" },
          { status: 400 }
        )
      }

      const apiKey = process.env.MOLLIE_API_KEY
      if (!apiKey) {
        return NextResponse.json(
          { error: "Mollie non configuré (MOLLIE_API_KEY manquant)" },
          { status: 503 }
        )
      }

      const mollie = createMollieClient({ apiKey })
      const payment = await mollie.payments.get(paymentId)
      const metadata = (payment.metadata as Record<string, string>) || {}
      const userMatch =
        metadata.userId === session.user.id ||
        (typeof session.user.email === "string" &&
          typeof metadata.email === "string" &&
          metadata.email.trim().toLowerCase() === session.user.email.trim().toLowerCase())

      if (!userMatch || payment.status !== "paid" || metadata.type !== "decennale_premier_trimestre") {
        return NextResponse.json(
          { error: "Création d'attestation non autorisée pour ce paiement" },
          { status: 403 }
        )
      }

      const existing = await prisma.document.findFirst({
        where: {
          userId: session.user.id,
          type: "attestation",
          data: { contains: `"molliePaymentId":"${paymentId}"` },
        },
        select: { id: true, numero: true, verificationToken: true },
      })
      if (existing) {
        return NextResponse.json(existing)
      }
    }

    const numero =
      customNumero && typeof customNumero === "string" && customNumero.length > 0
        ? customNumero
        : await getNextNumero(type)

    try {
      let normalizedData: unknown = data
      if (data && typeof data === "object" && !Array.isArray(data)) {
        const dataRecord = { ...(data as Record<string, unknown>) }
        const activitesInput = Array.isArray(dataRecord.activites)
          ? dataRecord.activites
              .filter((value): value is string => typeof value === "string")
              .map((value) => value.trim())
              .filter((value) => value.length > 0)
          : []

        if (activitesInput.length > 0) {
          const hierarchy = await resolveUserActivitiesHierarchy(activitesInput, {
            userId: session.user.id,
          })
          if (hierarchy.guaranteedHierarchyLines.length > 0) {
            dataRecord.activites = hierarchy.guaranteedHierarchyLines
            dataRecord.activitesStructurees = hierarchy.guaranteedHierarchyLines
            dataRecord.activitesNormalisees = hierarchy.guaranteedActivitiesFlat
            dataRecord.confidenceNomenclature = hierarchy.confidence
            dataRecord.activitesHorsNomenclature = hierarchy.unmatched.map((item) => item.input)
            dataRecord.alertsNomenclature = hierarchy.unmatched.map(
              (item) =>
                `Activité hors nomenclature: ${item.input}${
                  item.suggestedActivity
                    ? ` (suggestion: ${item.suggestedActivity.code} ${item.suggestedActivity.name})`
                    : ""
                }`
            )
          }
        }
        normalizedData = dataRecord
      }

      const document = await prisma.document.create({
        data: {
          userId: session.user.id,
          type,
          numero,
          data: JSON.stringify(
            type === "attestation" &&
              normalizedData &&
              typeof normalizedData === "object" &&
              !Array.isArray(normalizedData)
              ? {
                  ...(normalizedData as Record<string, unknown>),
                  molliePaymentId:
                    typeof body?.paymentId === "string" && body.paymentId.trim().length > 0
                      ? body.paymentId.trim()
                      : undefined,
                }
              : normalizedData
          ),
          ...(type === "attestation" && {
            verificationToken: generateVerificationToken(),
            status: "valide",
          }),
        },
      })

      return NextResponse.json({
        id: document.id,
        numero: document.numero,
        verificationToken: document.verificationToken,
      })
    } catch (err: unknown) {
      // Contrat déjà créé par finalisation signature / webhook (numero unique)
      const prismaErr = err as { code?: string }
      if (prismaErr?.code === "P2002" && type === "contrat") {
        const existing = await prisma.document.findFirst({
          where: { type: "contrat", numero },
        })
        if (existing) {
          return NextResponse.json({
            id: existing.id,
            numero: existing.numero,
            verificationToken: existing.verificationToken,
          })
        }
      }
      throw err
    }
  } catch (error) {
    console.error("Erreur création document:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création" },
      { status: 500 }
    )
  }
}
