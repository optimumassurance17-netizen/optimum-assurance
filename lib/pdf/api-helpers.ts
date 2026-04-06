import { NextResponse } from "next/server"
import { PdfValidationError } from "./errors"

export function pdfBufferResponse(buffer: Uint8Array, filename: string): NextResponse {
  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}

export function handlePdfError(e: unknown): NextResponse {
  if (e instanceof PdfValidationError) {
    const status = e.code === "CERTIFICATE_BLOCKED" ? 403 : 400
    return NextResponse.json({ error: e.message, code: e.code }, { status })
  }
  console.error("[api/pdf]", e)
  return NextResponse.json({ error: "Erreur génération PDF" }, { status: 500 })
}

/** Si `PDF_API_SECRET` est défini, exige `Authorization: Bearer <secret>`. */
export function isPdfApiAuthorized(request: Request): boolean {
  const secret = process.env.PDF_API_SECRET
  if (!secret) return true
  const header = request.headers.get("authorization")
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null
  return token === secret
}

/** Réponse 401 explicite lorsque le secret PDF est actif (évite la confusion « PDF cassé »). */
export function pdfApiUnauthorizedResponse(): NextResponse {
  const hasSecret = !!process.env.PDF_API_SECRET?.trim()
  return NextResponse.json(
    {
      error: "Non autorisé",
      ...(hasSecret && {
        hint: 'Ajoutez l’en-tête Authorization: Bearer <PDF_API_SECRET>, ou retirez PDF_API_SECRET si vous n’en avez pas besoin.',
      }),
    },
    { status: 401 }
  )
}
