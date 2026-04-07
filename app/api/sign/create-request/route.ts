import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { renderToBuffer } from "@react-pdf/renderer"
import React from "react"
import { ContratPDF } from "@/components/pdf/ContratPDF"
import { getNextNumero } from "@/lib/documents"
import { prisma } from "@/lib/prisma"
import { FRANCHISE_DECENNALE_EUR } from "@/lib/tarification"
import { uploadPdfAndInsertSignRequest } from "@/lib/esign/upload-pdf-and-insert-sign-request"
import { asJsonObject } from "@/lib/json-object"

export const runtime = "nodejs"

type SouscriptionTarif = {
  primeAnnuelle?: number
  primeMensuelle?: number
  primeTrimestrielle?: number
  franchise?: number
  plafond?: number
}

type SouscriptionPayload = {
  raisonSociale?: string
  email?: string
  representantLegal?: string
  siret?: string
  adresse?: string
  codePostal?: string
  ville?: string
  civilite?: string
  activites?: string[]
  chiffreAffaires?: number
  tarif?: SouscriptionTarif
  jamaisAssure?: boolean
  reprisePasse?: boolean
  dateCreationSociete?: string
}

/** Décennale : PDF contrat + ligne `sign_requests` (Supabase) + `pendingSignature`. */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = asJsonObject<{ souscription?: unknown }>(await request.json())
    const souscription = asJsonObject<SouscriptionPayload>(body.souscription)

    if (!souscription.raisonSociale || !souscription.email || !souscription.representantLegal) {
      return NextResponse.json(
        { error: "Données de souscription incomplètes" },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const now = new Date()
    const dateEffet = now.toLocaleDateString("fr-FR")
    const dateEffetIso = now.toISOString().split("T")[0]
    const dateEcheance = new Date(now.getFullYear(), 11, 31).toLocaleDateString("fr-FR")

    const baseContract = {
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
      primeTrimestrielle:
        typeof souscription.tarif?.primeTrimestrielle === "number"
          ? souscription.tarif.primeTrimestrielle
          : souscription.tarif?.primeAnnuelle
            ? Math.round((souscription.tarif.primeAnnuelle / 4) * 100) / 100
            : undefined,
      modePaiement: "prelevement",
      periodicitePrelevement: "trimestriel",
      fraisGestionPrelevement: 60,
      franchise: souscription.tarif?.franchise ?? FRANCHISE_DECENNALE_EUR,
      plafond: souscription.tarif?.plafond || 100000,
      dateEffet,
      dateEffetIso,
      dateEcheance,
      jamaisAssure: souscription.jamaisAssure,
      reprisePasse: souscription.reprisePasse,
      dateCreationSociete: souscription.dateCreationSociete,
    }

    const contractData = { ...baseContract, signatureProvider: "supabase" as const }

    const pdfElement = React.createElement(ContratPDF, {
      numero: baseContract.numero,
      data: baseContract,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = Buffer.from(await renderToBuffer(pdfElement as any))

    const folder = randomUUID()
    const storagePath = `souscription/decennale/${folder}/contrat-${baseContract.numero}.pdf`

    const { id: signRequestId } = await uploadPdfAndInsertSignRequest(pdfBuffer, storagePath)

    await prisma.pendingSignature.create({
      data: {
        signatureRequestId: signRequestId,
        userId: session.user.id,
        contractData: JSON.stringify(contractData),
        contractNumero: baseContract.numero,
      },
    })

    const nextPath = "/signature/callback?success=1"
    const signatureLink = `${baseUrl}/sign/${signRequestId}?next=${encodeURIComponent(nextPath)}`

    return NextResponse.json({
      signatureRequestId: signRequestId,
      signatureLink,
      contractNumero: contractData.numero,
      contractData,
    })
  } catch (error) {
    console.error("[api/sign/create-request]", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erreur lors de la création de la signature",
      },
      { status: 500 }
    )
  }
}
