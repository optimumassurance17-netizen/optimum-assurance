"use client"

import { useState, type FormEvent } from "react"
import { readResponseJson } from "@/lib/read-response-json"

export type DocumentRequestSent = {
  id: string
  message: string
  assuranceLabel: string
  sentTo: string
  adminEmail: string
  createdAt: string
}

export type DocumentRequestResult = {
  type: "success" | "warning" | "error"
  message: string
  request?: DocumentRequestSent
}

type Props = {
  userId?: string
  insuranceContractId?: string
  documentId?: string
  disabled?: boolean
  disabledTitle?: string
  variant?: "compact" | "card"
  onResult?: (result: DocumentRequestResult) => void
}

export function DocumentRequestButton({
  userId,
  insuranceContractId,
  documentId,
  disabled = false,
  disabledTitle,
  variant = "compact",
  onResult,
}: Props) {
  const [open, setOpen] = useState(variant === "card")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (disabled || sending) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch("/api/gestion/demande-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          ...(userId ? { userId } : {}),
          ...(insuranceContractId ? { insuranceContractId } : {}),
          ...(documentId ? { documentId } : {}),
        }),
      })
      const json = await readResponseJson<{
        error?: string
        emailSent?: boolean
        warning?: string
        sentTo?: string
        request?: DocumentRequestSent | null
      }>(res)
      if (!res.ok) {
        throw new Error(json.error || "Impossible d'envoyer la demande.")
      }
      if (json.emailSent === false) {
        const warning = json.warning || "Email non envoyé. La demande n'est pas partie."
        setError(warning)
        onResult?.({ type: "warning", message: warning })
        return
      }
      setMessage("")
      if (variant !== "card") setOpen(false)
      onResult?.({
        type: "success",
        message: `Demande envoyée${json.sentTo ? ` à ${json.sentTo}` : ""}.`,
        request: json.request ?? undefined,
      })
    } catch (cause) {
      const text = cause instanceof Error ? cause.message : "Impossible d'envoyer la demande."
      setError(text)
      onResult?.({ type: "error", message: text })
    } finally {
      setSending(false)
    }
  }

  const field = (
    <form onSubmit={(event) => void submit(event)} className={variant === "card" ? "space-y-3" : "mt-2 w-full max-w-xs space-y-2"}>
      <label className={variant === "card" ? "block text-sm text-gray-200" : "block text-xs text-gray-300"}>
        Message au client
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={variant === "card" ? 4 : 3}
          maxLength={2000}
          required
          placeholder="Indiquez le document à transmettre."
          className="mt-1 w-full rounded-lg border border-gray-600 bg-[#1a1a1a] px-3 py-2 text-sm text-white placeholder-gray-500"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={disabled || sending || message.trim().length < 8}
          className="rounded-lg bg-[#2563eb] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-50"
        >
          {sending ? "Envoi…" : variant === "card" ? "Demander un document" : "Envoyer la demande"}
        </button>
        {variant !== "card" ? (
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              setError(null)
            }}
            className="text-xs text-gray-400 hover:text-gray-200"
          >
            Annuler
          </button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </form>
  )

  if (variant === "card") return field

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        title={disabled ? disabledTitle : "Écrire le document demandé, puis envoyer"}
        onClick={() => {
          if (disabled) return
          setOpen((value) => !value)
          setError(null)
        }}
        className="text-xs font-medium text-amber-300 hover:text-amber-200 disabled:opacity-50"
      >
        Demander un document
      </button>
      {open ? field : null}
    </div>
  )
}
