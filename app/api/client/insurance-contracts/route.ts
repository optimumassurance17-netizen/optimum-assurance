import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { collapseDecennaleContractDuplicates } from "@/lib/decennale-contract-replacement"
import { prisma } from "@/lib/prisma"
import type { InsuranceContractListItem } from "@/lib/insurance-contract-types"
import { doQuotePaymentAllowed } from "@/lib/do-quote-signature-rules"

/**
 * Contrats plateforme (Prisma) liés à l'utilisateur connecté.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    await collapseDecennaleContractDuplicates({ userId: session.user.id })

    const rows = await prisma.insuranceContract.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        contractNumber: true,
        status: true,
        premium: true,
        productType: true,
        clientName: true,
        createdAt: true,
        paidAt: true,
        rejectedReason: true,
        signedQuoteStorageKey: true,
      },
    })

    const contracts: InsuranceContractListItem[] = rows.map((c) => ({
      id: c.id,
      contractNumber: c.contractNumber,
      status: c.status,
      premium: c.premium,
      productType: c.productType,
      clientName: c.clientName,
      createdAt: c.createdAt.toISOString(),
      paidAt: c.paidAt?.toISOString() ?? null,
      rejectedReason: c.rejectedReason,
      quoteSigned: doQuotePaymentAllowed(c.productType, c.signedQuoteStorageKey),
    }))

    return NextResponse.json({ contracts })
  } catch (e) {
    console.error("insurance-contracts:", e)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
