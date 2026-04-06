"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import SignatureCanvas from "react-signature-canvas"
import type { SignatureCanvas as SignatureCanvasHandle } from "react-signature-canvas"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Props = {
  documentId: string
  documentSignedUrl: string
  /** Après succès, redirection (chemin interne) au lieu de l’écran de téléchargement seul. */
  afterSignRedirect?: string
}

export function SignDocumentClient({ documentId, documentSignedUrl, afterSignRedirect }: Props) {
  const sigRef = useRef<SignatureCanvasHandle>(null)
  const [email, setEmail] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successUrl, setSuccessUrl] = useState<string | null>(null)

  const clearSignature = () => {
    sigRef.current?.clear()
    setError(null)
  }

  const submit = async () => {
    setError(null)

    if (!agreed) {
      setError("Vous devez accepter de signer le document.")
      return
    }

    if (!EMAIL_RE.test(email.trim())) {
      setError("Adresse e-mail invalide.")
      return
    }

    const pad = sigRef.current
    if (!pad || pad.isEmpty()) {
      setError("Veuillez apposer votre signature.")
      return
    }

    const dataUrl = pad.toDataURL("image/png")
    setLoading(true)
    try {
      const res = await fetch("/api/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          signature: dataUrl,
          email: email.trim(),
          agreed: true,
        }),
      })
      const data = (await res.json()) as { error?: string; signedDocumentUrl?: string }
      if (!res.ok) {
        setError(data.error ?? "La signature a échoué.")
        return
      }
      if (!data.signedDocumentUrl) {
        setError("Réponse serveur inattendue.")
        return
      }
      if (afterSignRedirect) {
        window.location.href = afterSignRedirect
        return
      }
      setSuccessUrl(data.signedDocumentUrl)
    } catch {
      setError("Erreur réseau. Réessayez.")
    } finally {
      setLoading(false)
    }
  }

  if (successUrl) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-8 shadow-sm">
        <h2 className="text-xl font-bold text-emerald-900">Document signé</h2>
        <p className="mt-2 text-sm text-emerald-900/90">
          Votre signature a été enregistrée. Vous pouvez télécharger le PDF signé.
        </p>
        <a
          href={successUrl}
          download
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Télécharger le PDF signé
        </a>
        <p className="mt-4 text-xs text-emerald-900/80">
          <Link href="/" className="font-semibold underline underline-offset-2">
            Retour à l’accueil
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner">
        <iframe title="Document PDF" src={documentSignedUrl} className="h-[min(70vh,640px)] w-full bg-white" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Signature</h2>
        <p className="mt-1 text-sm text-slate-600">Signez dans le cadre ci-dessous.</p>

        <div className="mt-4 rounded-xl border-2 border-slate-300 bg-slate-50 p-2">
          <SignatureCanvas
            ref={sigRef}
            penColor="#0f172a"
            canvasProps={{
              className: "mx-auto block w-full max-w-full touch-none rounded-lg bg-white",
              width: 560,
              height: 200,
            }}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={clearSignature}
            disabled={loading}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            Effacer la signature
          </button>
        </div>

        <label className="mt-6 block text-sm font-semibold text-slate-900">
          E-mail
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 disabled:bg-slate-100"
            placeholder="vous@exemple.fr"
          />
        </label>

        <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-slate-800">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            disabled={loading}
            className="mt-1 h-4 w-4 rounded border-slate-400"
          />
          <span>J’accepte de signer ce document électroniquement.</span>
        </label>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void submit()}
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-blue-600 py-4 text-center text-base font-bold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {loading ? "Signature en cours…" : "Signer le document"}
        </button>
      </div>
    </div>
  )
}
