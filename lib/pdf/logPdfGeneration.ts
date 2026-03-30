import { prisma } from "@/lib/prisma"

export async function logPdfGeneration(input: {
  contractNumber: string
  productType: "decennale" | "do"
  documentType: "quote" | "policy" | "certificate"
  userId?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    await prisma.pdfGenerationLog.create({
      data: {
        contractNumber: input.contractNumber,
        productType: input.productType,
        documentType: input.documentType,
        userId: input.userId ?? undefined,
        metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
      },
    })
  } catch (e) {
    console.error("[pdf] logPdfGeneration:", e)
  }
}
