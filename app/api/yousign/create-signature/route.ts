import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { renderToBuffer } from "@react-pdf/renderer"
import React from "react"
import { ContratPDF } from "@/components/pdf/ContratPDF"
import { createSignatureRequest } from "@/lib/yousign"
import { getNextNumero } from "@/lib/documents"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()
    const { souscription } = body

    if (!souscription?.raisonSociale || !souscription?.email || !souscription?.representantLegal) {
      return NextResponse.json(
        { error: "Données de souscription incomplètes" },
        { status: 400 }
      )
    }

    const apiKey = process.env.YOUSIGN_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Yousign non configuré (YOUSIGN_API_KEY)" },
        { status: 503 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const now = new Date()
    const dateEffet = now.toLocaleDateString("fr-FR")
    const dateEffetIso = now.toISOString().split("T")[0]
    const dateEcheance = new Date(now.getFullYear(), 11, 31).toLocaleDateString("fr-FR")

    const contractData = {
      numero: await getNextNumero("contrat"),
      raisonSociale: souscription.raisonSociale,
      siret: souscription.siret || "",
      adresse: souscription.adresse,
      codePostal: souscription.codePostal,
      ville: souscription.ville,
      representantLegal: souscription.representantLegal,
      civilite: souscription.civilite,
      activites: souscription.activites || [],
      chiffreAffaires: souscription.chiffreAffaires || 0,
      primeAnnuelle: souscription.tarif?.primeAnnuelle || 0,
      primeMensuelle: souscription.tarif?.primeMensuelle,
      primeTrimestrielle: souscription.tarif ? souscription.tarif.primeAnnuelle / 4 : undefined,
      modePaiement: "prelevement",
      periodicitePrelevement: "mensuel",
      fraisGestionPrelevement: 60,
      franchise: souscription.tarif?.franchise || 2500,
      plafond: souscription.tarif?.plafond || 100000,
      dateEffet,
      dateEffetIso,
      dateEcheance,
      jamaisAssure: souscription.jamaisAssure,
      reprisePasse: souscription.reprisePasse,
      dateCreationSociete: souscription.dateCreationSociete,
    }

    const pdfElement = React.createElement(ContratPDF, {
      numero: contractData.numero,
      data: contractData,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(pdfElement as any)

    const [firstName, ...lastParts] = (souscription.representantLegal || "Signataire").trim().split(" ")
    const lastName = lastParts.join(" ") || "Signataire"

    const result = await createSignatureRequest(
      Buffer.from(pdfBuffer),
      `contrat-${contractData.numero}.pdf`,
      {
        name: `Contrat décennale - ${souscription.raisonSociale}`,
        signerInfo: {
          first_name: firstName,
          last_name: lastName,
          email: souscription.email,
          locale: "fr",
        },
        redirectUrls: {
          success: `${baseUrl}/signature/callback?success=1`,
          error: `${baseUrl}/signature/callback?error=1`,
        },
      }
    )

    const signer = result.signers?.[0] as { signature_link?: string } | undefined
    const signatureLink = signer?.signature_link

    if (!signatureLink) {
      return NextResponse.json(
        { error: "Lien de signature non disponible" },
        { status: 500 }
      )
    }

    // Sauvegarder pour le webhook : signatureRequestId -> userId, contractData
    await prisma.pendingSignature.create({
      data: {
        signatureRequestId: result.id,
        userId: session.user.id,
        contractData: JSON.stringify(contractData),
        contractNumero: contractData.numero,
      },
    })

    return NextResponse.json({
      signatureRequestId: result.id,
      signatureLink,
      contractNumero: contractData.numero,
      contractData,
    })
  } catch (error) {
    console.error("Erreur création signature Yousign:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erreur lors de la création de la signature",
      },
      { status: 500 }
    )
  }
}
