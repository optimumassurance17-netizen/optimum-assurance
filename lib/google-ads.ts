import { createHmac, randomBytes, timingSafeEqual } from "crypto"
import { decryptSecret, encryptSecret } from "@/lib/ads-token-crypto"
import { prisma } from "@/lib/prisma"

const GOOGLE_PROVIDER = "google"
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GOOGLE_ADS_SCOPE = "openid email https://www.googleapis.com/auth/adwords"
export const GOOGLE_ADS_STATE_COOKIE = "oa_google_ads_state"

export type GoogleAdsConfig = {
  clientId: string
  clientSecret: string
  developerToken: string
  apiVersion: string
  loginCustomerId: string
}

export function googleAdsConfig(): GoogleAdsConfig {
  return {
    clientId: process.env.GOOGLE_ADS_CLIENT_ID?.trim() || "",
    clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET?.trim() || "",
    developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim() || "",
    apiVersion: process.env.GOOGLE_ADS_API_VERSION?.trim() || "v19",
    loginCustomerId: (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || "").replace(/\D/g, ""),
  }
}

export function googleAdsOAuthReady(): boolean {
  const config = googleAdsConfig()
  return Boolean(config.clientId && config.clientSecret)
}

export function googleAdsReadReady(): boolean {
  return googleAdsOAuthReady() && Boolean(googleAdsConfig().developerToken)
}

export function googleAdsRedirectUri(origin: string): string {
  const explicit = process.env.GOOGLE_ADS_REDIRECT_URI?.trim()
  if (explicit) return explicit
  return `${origin.replace(/\/$/, "")}/api/gestion/ads/google/callback`
}

export function createGoogleAdsState(email: string): string {
  const secret = process.env.NEXTAUTH_SECRET?.trim()
  if (!secret) throw new Error("NEXTAUTH_SECRET manquant.")
  const payload = Buffer.from(
    JSON.stringify({
      nonce: randomBytes(16).toString("hex"),
      email: email.toLowerCase(),
      exp: Date.now() + 10 * 60 * 1000,
    })
  ).toString("base64url")
  const signature = createHmac("sha256", secret).update(payload).digest("base64url")
  return `${payload}.${signature}`
}

export function readGoogleAdsState(state: string): { email: string } | null {
  const secret = process.env.NEXTAUTH_SECRET?.trim()
  const [payload, signature] = state.split(".")
  if (!secret || !payload || !signature) return null
  const expected = createHmac("sha256", secret).update(payload).digest("base64url")
  const left = Buffer.from(signature)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      email?: string
      exp?: number
    }
    if (!parsed.email || !parsed.exp || parsed.exp < Date.now()) return null
    return { email: parsed.email }
  } catch {
    return null
  }
}

export function googleAdsAuthUrl(origin: string, state: string): string {
  const config = googleAdsConfig()
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: googleAdsRedirectUri(origin),
    response_type: "code",
    scope: GOOGLE_ADS_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  })
  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

type TokenResponse = {
  access_token?: string
  refresh_token?: string
  error?: string
  error_description?: string
}

async function exchangeGoogleToken(body: URLSearchParams): Promise<TokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
  const json = (await response.json().catch(() => ({}))) as TokenResponse
  if (!response.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || "Google a refusé le jeton.")
  }
  return json
}

export async function exchangeGoogleAdsCode(origin: string, code: string): Promise<string> {
  const config = googleAdsConfig()
  const tokens = await exchangeGoogleToken(
    new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: googleAdsRedirectUri(origin),
      grant_type: "authorization_code",
    })
  )
  if (!tokens.refresh_token) {
    throw new Error("Google n'a pas renvoyé de jeton durable. Relancez la connexion et acceptez l'accès.")
  }
  return tokens.refresh_token
}

async function accessTokenFromRefresh(refreshToken: string): Promise<string> {
  const config = googleAdsConfig()
  const tokens = await exchangeGoogleToken(
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
    })
  )
  return tokens.access_token || ""
}

export async function saveGoogleAdsConnection(input: {
  refreshToken: string
  accountEmail?: string | null
  connectedByEmail: string
}) {
  const refreshTokenEncrypted = encryptSecret(input.refreshToken)
  return prisma.adsConnection.upsert({
    where: { provider: GOOGLE_PROVIDER },
    create: {
      provider: GOOGLE_PROVIDER,
      refreshTokenEncrypted,
      accountEmail: input.accountEmail || null,
      connectedByEmail: input.connectedByEmail,
    },
    update: {
      refreshTokenEncrypted,
      accountEmail: input.accountEmail || null,
      connectedByEmail: input.connectedByEmail,
    },
  })
}

export async function googleAccountEmail(refreshToken: string): Promise<string | null> {
  const accessToken = await accessTokenFromRefresh(refreshToken)
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) return null
  const json = (await response.json().catch(() => ({}))) as { email?: string }
  return json.email || null
}

export type GoogleAdsConnectionView = {
  accountEmail: string | null
  customerId: string | null
  connectedAt: string
  connectedByEmail: string | null
}

export async function getGoogleAdsConnectionView(): Promise<GoogleAdsConnectionView | null> {
  const row = await prisma.adsConnection.findUnique({
    where: { provider: GOOGLE_PROVIDER },
    select: {
      accountEmail: true,
      customerId: true,
      connectedByEmail: true,
      updatedAt: true,
    },
  })
  if (!row) return null
  return {
    accountEmail: row.accountEmail,
    customerId: row.customerId,
    connectedByEmail: row.connectedByEmail,
    connectedAt: row.updatedAt.toISOString(),
  }
}

async function storedRefreshToken(): Promise<{ token: string; customerId: string | null }> {
  const row = await prisma.adsConnection.findUnique({
    where: { provider: GOOGLE_PROVIDER },
    select: { refreshTokenEncrypted: true, customerId: true },
  })
  if (!row) throw new Error("Aucun compte Google Ads n'est connecté.")
  return { token: decryptSecret(row.refreshTokenEncrypted), customerId: row.customerId }
}

function adsHeaders(accessToken: string): HeadersInit {
  const config = googleAdsConfig()
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": config.developerToken,
    "Content-Type": "application/json",
  }
  if (config.loginCustomerId) headers["login-customer-id"] = config.loginCustomerId
  return headers
}

export function normalizeCustomerId(value: string): string {
  return value.replace(/\D/g, "")
}

export async function listGoogleAdsCustomers(): Promise<string[]> {
  if (!googleAdsReadReady()) {
    throw new Error("Le jeton développeur Google Ads n'est pas configuré.")
  }
  const stored = await storedRefreshToken()
  const accessToken = await accessTokenFromRefresh(stored.token)
  const version = googleAdsConfig().apiVersion
  const response = await fetch(
    `https://googleads.googleapis.com/${version}/customers:listAccessibleCustomers`,
    { headers: adsHeaders(accessToken) }
  )
  const json = (await response.json().catch(() => ({}))) as {
    resourceNames?: string[]
    error?: { message?: string }
  }
  if (!response.ok) {
    throw new Error(json.error?.message || "Lecture des comptes Google Ads refusée.")
  }
  return (json.resourceNames || [])
    .map((name) => normalizeCustomerId(name.split("/").pop() || ""))
    .filter((id) => id.length >= 6)
}

export async function selectGoogleAdsCustomer(customerId: string) {
  const id = normalizeCustomerId(customerId)
  if (id.length < 6) throw new Error("Numéro de compte Google Ads invalide.")
  const accessible = await listGoogleAdsCustomers()
  if (!accessible.includes(id)) {
    throw new Error("Ce compte n'est pas accessible avec la connexion actuelle.")
  }
  await prisma.adsConnection.update({
    where: { provider: GOOGLE_PROVIDER },
    data: { customerId: id },
  })
  return id
}

export type GoogleCampaign = {
  id: string
  name: string
  status: string
}

const STATUS_LABELS: Record<string, string> = {
  ENABLED: "Active",
  PAUSED: "En pause",
  REMOVED: "Supprimée",
}

export async function listGoogleAdsCampaigns(): Promise<GoogleCampaign[]> {
  if (!googleAdsReadReady()) {
    throw new Error("Le jeton développeur Google Ads n'est pas configuré.")
  }
  const stored = await storedRefreshToken()
  if (!stored.customerId) throw new Error("Choisissez d'abord le compte Google Ads à lire.")
  const accessToken = await accessTokenFromRefresh(stored.token)
  const version = googleAdsConfig().apiVersion
  const response = await fetch(
    `https://googleads.googleapis.com/${version}/customers/${stored.customerId}/googleAds:search`,
    {
      method: "POST",
      headers: adsHeaders(accessToken),
      body: JSON.stringify({
        query:
          "SELECT campaign.id, campaign.name, campaign.status FROM campaign WHERE campaign.status != 'REMOVED' ORDER BY campaign.id LIMIT 20",
      }),
    }
  )
  const json = (await response.json().catch(() => ({}))) as {
    results?: Array<{ campaign?: { id?: string; name?: string; status?: string } }>
    error?: { message?: string }
  }
  if (!response.ok) {
    throw new Error(json.error?.message || "Lecture des campagnes refusée.")
  }
  return (json.results || []).map((row) => ({
    id: String(row.campaign?.id || ""),
    name: row.campaign?.name || "Campagne",
    status: STATUS_LABELS[row.campaign?.status || ""] || row.campaign?.status || "Inconnu",
  }))
}

export async function disconnectGoogleAds() {
  await prisma.adsConnection.deleteMany({ where: { provider: GOOGLE_PROVIDER } })
}
