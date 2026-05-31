import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { checkRateLimitMemory, getClientIp } from "@/lib/rate-limit"

export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = "APP_ERROR"
  ) {
    super(message)
  }
}

export function assertCronSecret(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET absent" }, { status: 503 })
  }
  const token = request.headers.get("authorization")?.trim()
  if (token !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }
  return null
}

export function rateLimitGuard(
  req: NextRequest,
  key: string,
  options: { max: number; windowMs: number } = { max: 40, windowMs: 60_000 }
): NextResponse | null {
  const ip = getClientIp(req)
  const out = checkRateLimitMemory(`${key}:${ip}`, options.max, options.windowMs)
  if (out.ok) return null
  return NextResponse.json(
    { error: "Trop de requêtes, réessayez plus tard." },
    { status: 429, headers: { "Retry-After": String(out.retryAfterSec) } }
  )
}

export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      if (error instanceof AppError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
      }
      console.error("[OGI] erreur inattendue:", error)
      return NextResponse.json({ error: "Erreur interne" }, { status: 500 })
    }
  }
}
