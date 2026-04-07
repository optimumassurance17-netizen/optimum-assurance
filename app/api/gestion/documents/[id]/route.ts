import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { asJsonObject } from "@/lib/json-object"
import { logAdminActivity } from "@/lib/admin-activity"
import { IDENTITY_DOC_KEYS, syncUserFromDocumentMergedData } from "@/lib/sync-user-document-identity"

/**
 * GET - Récupérer un document (admin uniquement, pour consultation)
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { id } = await params

    const document = await prisma.document.findFirst({
      where: { id },
      include: { user: { select: { raisonSociale: true, email: true } } },
    })

    if (!document) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
    }

    const data = JSON.parse(document.data || "{}") as Record<string, unknown>
    if (document.user) {
      data.raisonSociale = document.user.raisonSociale ?? data.raisonSociale
      data.email = document.user.email ?? data.email
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { user, ...doc } = document
    return NextResponse.json({ ...doc, data })
  } catch (error) {
    console.error("Erreur récupération document:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Modification des données d'un contrat ou avenant (admin uniquement)
 * Body: { data: { chiffreAffaires?, primeAnnuelle?, activites?, motifAvenant?, dateEffet?, dateEcheance?, ... } }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { id } = await params
    const body = asJsonObject<{ data?: Record<string, unknown> }>(await request.json())
    const { data: modifications } = body

    if (!modifications || typeof modifications !== "object") {
      return NextResponse.json({ error: "data requis (objet)" }, { status: 400 })
    }

    const document = await prisma.document.findFirst({
      where: { id, type: { in: ["contrat", "avenant"] } },
    })

    if (!document) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
    }

    const currentData = JSON.parse(document.data || "{}") as Record<string, unknown>

    const allowedKeys = [
      "chiffreAffaires", "primeAnnuelle", "activites", "motifAvenant",
      "dateEffet", "dateEcheance", "raisonSociale", "siret", "adresse",
      "codePostal", "ville", "email", "telephone", "representantLegal", "civilite",
      "primeMensuelle", "primeTrimestrielle", "modePaiement",
      "periodicitePrelevement", "fraisGestionPrelevement", "franchise", "plafond",
    ]
    const filteredModifications: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(modifications)) {
      if (allowedKeys.includes(key) && value !== undefined) {
        if (key === "activites" && Array.isArray(value)) {
          filteredModifications[key] = value
        } else if (key === "activites" && typeof value === "string") {
          filteredModifications[key] = value.split(",").map((a) => a.trim()).filter(Boolean)
        } else {
          filteredModifications[key] = value
        }
      }
    }

    const mergedData = { ...currentData, ...filteredModifications }

    await prisma.document.update({
      where: { id },
      data: { data: JSON.stringify(mergedData) },
    })

    const identityTouched = IDENTITY_DOC_KEYS.filter((k) => k in filteredModifications)
    if (identityTouched.length > 0) {
      const subset: Record<string, unknown> = {}
      for (const k of identityTouched) {
        subset[k] = mergedData[k]
      }
      const sync = await syncUserFromDocumentMergedData(document.userId, subset)
      if (!sync.ok) {
        await prisma.document.update({
          where: { id },
          data: { data: JSON.stringify(currentData) },
        })
        return NextResponse.json({ error: sync.error }, { status: sync.status })
      }
    }

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: "document_update",
      targetType: "document",
      targetId: id,
      details: { numero: document.numero, modifiedKeys: Object.keys(filteredModifications) },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Erreur modification document:", error)
    return NextResponse.json(
      { error: "Erreur lors de la modification" },
      { status: 500 }
    )
  }
}
