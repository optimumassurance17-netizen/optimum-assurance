import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { asJsonObject } from "@/lib/json-object"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"
import { SITE_URL } from "@/lib/site-url"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        raisonSociale: true,
        siret: true,
        adresse: true,
        codePostal: true,
        ville: true,
        telephone: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Erreur profil:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = asJsonObject<{
      adresse?: string
      codePostal?: string
      ville?: string
      telephone?: string
      siret?: string
    }>(await request.json())
    const { adresse, codePostal, ville, telephone, siret } = body

    const updates: Record<string, string | null> = {}
    if (adresse !== undefined) updates.adresse = adresse ? String(adresse).trim() : null
    if (codePostal !== undefined) updates.codePostal = codePostal ? String(codePostal).trim() : null
    if (ville !== undefined) updates.ville = ville ? String(ville).trim() : null
    if (telephone !== undefined) updates.telephone = telephone ? String(telephone).trim() : null
    if (siret !== undefined) updates.siret = siret ? String(siret).trim() : null

    const hasAdresseOrSiretChange =
      (adresse !== undefined || codePostal !== undefined || ville !== undefined || siret !== undefined)

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updates,
    })

    if (hasAdresseOrSiretChange) {
      const attestations = await prisma.document.findMany({
        where: { userId: session.user.id, type: "attestation", status: "valide" },
      })

      for (const att of attestations) {
        const data = JSON.parse(att.data || "{}") as Record<string, unknown>
        data.adresse = user.adresse ?? data.adresse
        data.codePostal = user.codePostal ?? data.codePostal
        data.ville = user.ville ?? data.ville
        data.siret = user.siret ?? data.siret

        await prisma.document.update({
          where: { id: att.id },
          data: { data: JSON.stringify(data) },
        })

        const raisonSociale = (data.raisonSociale as string) || user.raisonSociale || user.email
        const documentUrl = `${SITE_URL}/espace-client/documents/${att.id}`
        const template = EMAIL_TEMPLATES.attestationMiseAJour(raisonSociale, att.numero, documentUrl)
        await sendEmail({
          to: user.email,
          subject: template.subject,
          text: template.text,
          html: (template as { html?: string }).html,
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Erreur mise à jour profil:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
