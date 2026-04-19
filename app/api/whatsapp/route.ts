import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getClientIp, getUserAgent } from "@/lib/esign/get-request-meta"
import {
  buildWhatsAppExternalUrl,
  buildWhatsAppTrackingActionId,
  getWhatsAppDefaultMessage,
  getWhatsAppSupportNumber,
  sanitizeWhatsAppMessage,
  sanitizeWhatsAppTrackingSource,
} from "@/lib/whatsapp"

const SOURCE_MAX = 80
const REF_MAX = 120

function optionalTrimmed(value: string | null): string | null {
  if (!value) return null
  const t = value.trim()
  return t.length > 0 ? t : null
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const source = sanitizeWhatsAppTrackingSource(
    optionalTrimmed(url.searchParams.get("source")) || "site"
  )
  const ref = optionalTrimmed(url.searchParams.get("ref")) || optionalTrimmed(url.searchParams.get("reference"))
  const leadType = optionalTrimmed(url.searchParams.get("leadType"))
  const leadId = optionalTrimmed(url.searchParams.get("leadId"))
  const messageInput = optionalTrimmed(url.searchParams.get("message")) || optionalTrimmed(url.searchParams.get("text"))
  const message = sanitizeWhatsAppMessage(messageInput || getWhatsAppDefaultMessage())
  const number = getWhatsAppSupportNumber()

  const whatsappUrl = buildWhatsAppExternalUrl(number, message)
  const ip = getClientIp(request)
  const ua = getUserAgent(request)
  const action = buildWhatsAppTrackingActionId(source)

  void prisma.adminActivityLog
    .create({
      data: {
        adminEmail: "system",
        action,
        targetType: leadType ? "whatsapp_lead" : "whatsapp",
        targetId: leadId ? leadId.slice(0, REF_MAX) : ref?.slice(0, REF_MAX) || null,
        details: JSON.stringify({
          source: source.slice(0, SOURCE_MAX),
          reference: ref ? ref.slice(0, REF_MAX) : null,
          leadType: leadType ? leadType.slice(0, SOURCE_MAX) : null,
          leadId: leadId ? leadId.slice(0, REF_MAX) : null,
          message,
          ip,
          userAgent: ua,
          href: whatsappUrl,
        }),
      },
    })
    .catch((error) => {
      console.error("[api/whatsapp] log failed:", error)
    })

  return NextResponse.redirect(whatsappUrl, { status: 302 })
}
