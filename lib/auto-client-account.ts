"use client"

import { signIn } from "next-auth/react"
import { readResponseJson } from "@/lib/read-response-json"
import { trackConversion } from "@/lib/conversion-tracking"

export type AutoClientAccountInput = {
  email: string
  raisonSociale?: string | null
  siret?: string | null
  telephone?: string | null
  adresse?: string | null
  codePostal?: string | null
  ville?: string | null
}

export type AutoClientAccountResult =
  | { ok: true; emailSent: boolean; temporaryPassword?: string }
  | { ok: false; reason: "exists" | "error"; message: string }

const pending = new Map<string, Promise<AutoClientAccountResult>>()

function optionalText(value: string | null | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

async function createOnce(email: string, input: AutoClientAccountInput): Promise<AutoClientAccountResult> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      automatic: true,
      raisonSociale: optionalText(input.raisonSociale),
      siret: optionalText(input.siret),
      telephone: optionalText(input.telephone),
      adresse: optionalText(input.adresse),
      codePostal: optionalText(input.codePostal),
      ville: optionalText(input.ville),
    }),
  })
  const json = await readResponseJson<{ error?: string; temporaryPassword?: string; emailSent?: boolean }>(res)
  if (!res.ok) {
    const message = json.error || "Création de compte impossible"
    if (message.toLowerCase().includes("existe déjà")) {
      return { ok: false, reason: "exists", message }
    }
    return { ok: false, reason: "error", message }
  }

  const temporaryPassword = json.temporaryPassword
  if (!temporaryPassword) {
    return {
      ok: false,
      reason: "error",
      message: "Le compte est créé, mais la connexion automatique a échoué. Utilisez le mot de passe reçu par email.",
    }
  }

  const signInResult = await signIn("credentials", {
    email,
    password: temporaryPassword,
    redirect: false,
  })
  if (signInResult?.error) {
    return {
      ok: false,
      reason: "error",
      message: "Le compte est créé. Le mot de passe est dans votre email, la connexion automatique a échoué.",
    }
  }

  trackConversion("account_created", { source: "automatic" })
  return {
    ok: true,
    emailSent: json.emailSent !== false,
    ...(json.emailSent === false ? { temporaryPassword } : {}),
  }
}

/** Un seul appel par email, même si l'écran se recharge deux fois. */
export function createClientAccountAutomatically(input: AutoClientAccountInput): Promise<AutoClientAccountResult> {
  const email = input.email.trim().toLowerCase()
  const current = pending.get(email)
  if (current) return current

  const promise = createOnce(email, input).then((result) => {
    if (!result.ok && result.reason === "error") pending.delete(email)
    return result
  })
  pending.set(email, promise)
  return promise
}
