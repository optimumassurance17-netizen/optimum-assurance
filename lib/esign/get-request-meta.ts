import type { NextRequest } from "next/server"

export function getClientIp(request: NextRequest | Request): string | null {
  const h = request.headers
  const xff = h.get("x-forwarded-for")
  if (xff) {
    const first = xff.split(",")[0]?.trim()
    if (first) return first
  }
  const realIp = h.get("x-real-ip")
  if (realIp?.trim()) return realIp.trim()
  return null
}

export function getUserAgent(request: NextRequest | Request): string | null {
  const ua = request.headers.get("user-agent")
  return ua?.trim() ? ua.trim() : null
}
