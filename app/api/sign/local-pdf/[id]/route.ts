import { NextResponse } from "next/server"
import {
  FALLBACK_PDF_KEY,
  decodeStoredPdfBase64,
  isLocalFallbackContract,
  isRebuildableDecennaleContract,
  readContractObject,
} from "@/lib/esign/local-signature-fallback"
import { renderPendingDecennalePdf } from "@/lib/esign/render-pending-decennale-pdf"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
  if (!raw) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 })
  }

  let bytes: Uint8Array | null = null
  if (isLocalFallbackContract(raw)) {
    bytes = decodeStoredPdfBase64(raw[FALLBACK_PDF_KEY])
  } else if (isRebuildableDecennaleContract(raw)) {
    try {
      bytes = await renderPendingDecennalePdf(raw, pending.contractNumero)
    } catch {
      return NextResponse.json({ error: "Document illisible." }, { status: 422 })
    }
  }
  if (!bytes) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 })
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
