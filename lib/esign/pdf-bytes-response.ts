import { NextResponse } from "next/server"

/** Réponse PDF en flux, pour dépasser le plafond de 4,5 Mo d'une réponse tampon. */
export function pdfBytesResponse(
  bytes: Uint8Array,
  filename: string,
  disposition: "inline" | "attachment" = "inline"
): NextResponse {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const size = 64 * 1024
      for (let offset = 0; offset < bytes.byteLength; offset += size) {
        controller.enqueue(bytes.subarray(offset, Math.min(offset + size, bytes.byteLength)))
      }
      controller.close()
    },
  })
  const safeName = filename.replace(/["\r\n]/g, "") || "document.pdf"
  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
