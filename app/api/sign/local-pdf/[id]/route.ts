import { NextResponse } from "next/server"
import {
  FALLBACK_PDF_KEY,
  decodeStoredPdfBase64,
  isLocalFallbackContract,
  readContractObject,
} from "@/lib/esign/local-signature-fallback"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** PDF non signé du parcours de secours. L'identifiant tient lieu de secret, comme le lien Supabase. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 404 })
  }

  const pending = await prisma.pendingSignature.findUnique({
    where: { signatureRequestId: id },
    select: { contractNumero: true, contractData: true },
  })
  if (!pending) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 })
  }

  const raw = readContractObject(pending.contractData)
  if (!raw || !isLocalFallbackContract(raw)) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 })
  }

  const bytes = decodeStoredPdfBase64(raw[FALLBACK_PDF_KEY])
  if (!bytes) {
    return NextResponse.json({ error: "Document illisible." }, { status: 422 })
  }

  const safeNumero = pending.contractNumero.replace(/[^A-Za-z0-9._-]/g, "") || "contrat"
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="contrat-${safeNumero}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
