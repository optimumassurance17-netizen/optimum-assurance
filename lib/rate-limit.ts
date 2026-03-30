import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

/** IP client (proxy Vercel : x-forwarded-for). */
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for")
  if (xff) {
    const first = xff.split(",")[0]?.trim()
    if (first) return first
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown"
}

type WindowEntry = { count: number; windowStart: number }
const memoryStore = new Map<string, WindowEntry>()

function pruneMemory(now: number, windowMs: number) {
  if (memoryStore.size < 4000) return
  const cutoff = now - windowMs * 3
  for (const [k, v] of memoryStore) {
    if (v.windowStart < cutoff) memoryStore.delete(k)
  }
}

/** Fenêtre fixe (fallback si pas d’Upstash Redis). Meilleur effort par instance serverless. */
export function checkRateLimitMemory(
  key: string,
  max: number,
  windowMs: number,
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now()
  pruneMemory(now, windowMs)
  let e = memoryStore.get(key)
  if (!e || now - e.windowStart >= windowMs) {
    e = { count: 0, windowStart: now }
    memoryStore.set(key, e)
  }
  if (e.count >= max) {
    const retryAfterSec = Math.max(1, Math.ceil((e.windowStart + windowMs - now) / 1000))
    return { ok: false, retryAfterSec }
  }
  e.count += 1
  return { ok: true, retryAfterSec: 0 }
}

export const RATE_LIMITS = {
  chat: { max: 24, windowMs: 60_000 },
  contact: { max: 8, windowMs: 60_000 },
} as const

let sharedRedis: Redis | null | undefined

function getSharedRedis(): Redis | null {
  if (sharedRedis !== undefined) return sharedRedis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    sharedRedis = null
    return null
  }
  sharedRedis = new Redis({ url, token })
  return sharedRedis
}

let chatLimiter: Ratelimit | null | undefined
let contactLimiter: Ratelimit | null | undefined

function getChatLimiter(): Ratelimit | null {
  if (chatLimiter !== undefined) return chatLimiter
  const redis = getSharedRedis()
  if (!redis) {
    chatLimiter = null
    return null
  }
  chatLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.chat.max, "1 m"),
    prefix: "rl-chat",
  })
  return chatLimiter
}

function getContactLimiter(): Ratelimit | null {
  if (contactLimiter !== undefined) return contactLimiter
  const redis = getSharedRedis()
  if (!redis) {
    contactLimiter = null
    return null
  }
  contactLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.contact.max, "1 m"),
    prefix: "rl-contact",
  })
  return contactLimiter
}

/**
 * Retourne une réponse 429 si la limite est dépassée, sinon `null`.
 * Upstash Redis si `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`, sinon mémoire.
 */
export async function rateLimitResponse(
  req: NextRequest,
  kind: keyof typeof RATE_LIMITS,
): Promise<NextResponse | null> {
  const ip = getClientIp(req)
  const { max, windowMs } = RATE_LIMITS[kind]
  const limiter = kind === "chat" ? getChatLimiter() : getContactLimiter()

  if (limiter) {
    const { success, reset } = await limiter.limit(ip)
    if (!success) {
      const retryAfterSec = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
      return NextResponse.json(
        { error: "Trop de requêtes. Réessayez plus tard." },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
      )
    }
    return null
  }

  const { ok, retryAfterSec } = checkRateLimitMemory(`${kind}:${ip}`, max, windowMs)
  if (!ok) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
    )
  }
  return null
}
