import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { randomBytes } from "crypto"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { getNextNumero } from "@/lib/documents"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"
import { logAdminActivity } from "@/lib/admin-activity"

function generateVerificationToken(): string {
  return randomBytes(16).toString("hex")
}

/**
 * Création manuelle d'un document par l'admin (ex: devis dommage ouvrage).
 * Le document est ajouté à l'espace client du client cible.
 * Ensuite : signature électronique + paiement par virement (Mollie).
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

    const allowedTypes = ["devis", "devis_do", "contrat", "attestation"]
    if (!allowedTypes.includes(type)) {
      return NextResponse.json(
        { error: "Type invalide. Autorisés : devis, devis_do, contrat, attestation" },
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

    const document = await prisma.document.create({
      data: {
        userId,
        type,
        numero,
        data: JSON.stringify(data || {}),
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

    // Notification email pour devis dommage ouvrage
    if (type === "devis_do" && user.email) {
      const docData = (data || {}) as { primeAnnuelle?: number }
      const primeAnnuelle = docData.primeAnnuelle || 0
      const template = EMAIL_TEMPLATES.devisDoAjoute(
        user.raisonSociale || user.email,
        numero,
        primeAnnuelle
      )
      await sendEmail({
        to: user.email,
        subject: template.subject,
        text: template.text,
        html: (template as { html?: string }).html,
      })
    }

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
