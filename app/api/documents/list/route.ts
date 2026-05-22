import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const [documents, contracts] = await Promise.all([
      prisma.document.findMany({
        where: { userId: session.user.id },
        select: { id: true, type: true, numero: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.insuranceContract.findMany({
        where: { userId: session.user.id },
        select: {
          id: true,
          contractNumber: true,
          productType: true,
          status: true,
          createdAt: true,
          storedDocuments: {
            select: { id: true, type: true, url: true, createdAt: true },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ])

    const generatedDocuments = contracts.flatMap((contract) => {
      const baseUrl = `/api/contracts/${contract.id}/pdf`
      const existingByType = new Map(contract.storedDocuments.map((doc) => [doc.type, doc] as const))
      const requiredTypes = requiredGeneratedDocTypes(contract.productType)
      const materialized = contract.storedDocuments.map((doc) => ({
        id: `contract:${doc.id}`,
        type: toClientDocumentType(contract.productType, doc.type),
        numero: `${contract.contractNumber} — ${labelContractDoc(doc.type)}`,
        status: contract.status,
        createdAt: doc.createdAt,
        href: doc.url,
        generated: true,
        contractId: contract.id,
        productType: contract.productType,
      }))
      const virtual = requiredTypes
        .filter((type) => !existingByType.has(type))
        .map((type) => ({
          id: `contract-virtual:${contract.id}:${type}`,
          type: toClientDocumentType(contract.productType, type),
          numero: `${contract.contractNumber} — ${labelContractDoc(type)}`,
          status: contract.status,
          createdAt: contract.createdAt,
          href: `${baseUrl}/${type}`,
          generated: true,
          contractId: contract.id,
          productType: contract.productType,
        }))
      return [...materialized, ...virtual]
    })

    const merged = [...documents, ...generatedDocuments].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return NextResponse.json(merged)
  } catch (error) {
    console.error("Erreur liste documents:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    )
  }
}

function requiredGeneratedDocTypes(productType: string): string[] {
  if (productType === "do") return ["quote", "policy", "certificate", "invoice"]
  return []
}

function toClientDocumentType(productType: string, docType: string): string {
  if (docType === "quote") return productType === "do" ? "devis_do" : "devis_cp"
  if (docType === "policy") return "conditions_particulieres"
  if (docType === "certificate") return productType === "do" ? "attestation_do" : "attestation"
  if (docType === "invoice") return productType === "do" ? "facture_do" : "facture_decennale"
  if (docType === "schedule") return "echeancier"
  if (docType === "fic") return "fic"
  return `contrat_${docType}`
}

function labelContractDoc(type: string): string {
  if (type === "quote") return "Devis et conditions"
  if (type === "policy") return "Conditions particulières"
  if (type === "certificate") return "Attestation"
  if (type === "invoice") return "Facture"
  if (type === "schedule") return "Échéancier"
  if (type === "fic") return "FIC"
  return type
}
