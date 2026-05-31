"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"

type GateResolved = { userId: string; useEspaceClientOnly: boolean; hasEtudeSaved: boolean }

/**
 * Si le client est connecté et qu'une première demande Assurance titre est déjà connue,
 * on l'oriente vers le questionnaire d'étude dans l'espace client.
 */
export function AssuranceTitreClientGate({ children }: { children: ReactNode }) {
  const { status, data: session } = useSession()
  const userId = session?.user?.id ?? null
  const [resolved, setResolved] = useState<GateResolved | null>(null)

  useEffect(() => {
    if (status !== "authenticated" || !userId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/client/title-questionnaire")
        const json = (await res.json().catch(() => ({}))) as {
          useEspaceClientOnly?: boolean
          hasEtudeSaved?: boolean
        }
        if (!cancelled) {
          setResolved({
            userId,
            useEspaceClientOnly: Boolean(json.useEspaceClientOnly),
            hasEtudeSaved: Boolean(json.hasEtudeSaved),
          })
        }
      } catch {
        if (!cancelled) {
          setResolved({ userId, useEspaceClientOnly: false, hasEtudeSaved: false })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [status, userId])

  if (status === "loading") {
    return <p className="py-8 text-black">Chargement…</p>
  }
  if (status === "unauthenticated") {
    return <>{children}</>
  }
  if (!userId || !resolved || resolved.userId !== userId) {
    return <p className="py-8 text-black">Chargement…</p>
  }

  if (resolved.useEspaceClientOnly) {
    return (
      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-6 text-black shadow-sm">
        <h2 className="mb-2 text-lg font-bold text-[#0a0a0a]">Suite de votre dossier Assurance titre</h2>
        <p className="mb-4 leading-relaxed text-[#171717]">
          Vous avez déjà transmis une première demande. Inutile de refaire le formulaire public : complétez le{" "}
          <strong>questionnaire d&apos;étude</strong> depuis votre espace client. Les informations du premier envoi sont{" "}
          <strong>préremplies</strong> et vous pouvez ajouter les pièces et parties prenantes du dossier.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <Link
            href="/espace-client/assurance-titre"
            className="inline-flex items-center rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800"
          >
            {resolved.hasEtudeSaved ? "Modifier le questionnaire d’étude" : "Compléter le questionnaire d’étude"}
          </Link>
          <Link
            href="/espace-client"
            className="inline-flex items-center text-sm font-semibold text-[#2563eb] hover:underline"
          >
            Mon espace client
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
