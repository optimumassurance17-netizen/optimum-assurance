import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { randomBytes } from "crypto"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { getNextNumero } from "@/lib/documents"
import { logAdminActivity } from "@/lib/admin-activity"
import { generateOptimizedExclusions } from "@/lib/optimized-exclusions"

function generateVerificationToken(): string {
  return randomBytes(16).toString("hex")
}

/**
 * Création manuelle d'un document par l'admin.
 * Le document est ajouté à l'espace client du client cible.
 * Les contrats DO doivent être créés via /api/gestion/contracts/do/create.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 })
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Objet JSON attendu" }, { status: 400 })
    }

    const payload = body as Record<string, unknown>
    const userId = typeof payload.userId === "string" ? payload.userId.trim() : ""
    const type = typeof payload.type === "string" ? payload.type.trim() : ""
    const data = payload.data
    const customNumero =
      typeof payload.numero === "string" && payload.numero.trim().length > 0
        ? payload.numero.trim()
        : undefined

    if (!userId || !type) {
      return NextResponse.json(
        { error: "userId et type requis" },
        { status: 400 }
      )
    }

    const allowedTypes = ["devis", "contrat", "attestation"]
    if (!allowedTypes.includes(type)) {
      return NextResponse.json(
        { error: "Type invalide. Autorisés : devis, contrat, attestation" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, raisonSociale: true },
    })
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 })
    }

    const numero =
      customNumero
        ? customNumero
        : await getNextNumero(type)

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
        const optimizedExclusions = generateOptimizedExclusions(activitesInput)
        dataRecord.exclusionsOptimisees = optimizedExclusions.lines
        dataRecord.exclusionScore = optimizedExclusions.score
        dataRecord.activityExclusions = optimizedExclusions.lines
        dataRecord.exclusions = optimizedExclusions.lines
      }
      normalizedData = dataRecord
    }

    const document = await prisma.document.create({
      data: {
        userId,
        type,
        numero,
        data: JSON.stringify(normalizedData || {}),
        ...(type === "attestation" && {
          verificationToken: generateVerificationToken(),
          status: "valide",
        }),
      },
    })

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: "document_create",
      targetType: "document",
      targetId: document.id,
      details: { type, numero: document.numero, userId },
    })

    return NextResponse.json({
      id: document.id,
      numero: document.numero,
      verificationToken: document.verificationToken,
    })
  } catch (error) {
    console.error("Erreur création document admin:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création" },
      { status: 500 }
    )
  }
}
