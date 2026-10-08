"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import type { ReactNode } from "react"

type GateResolved = {
  userId: string
  useEspaceClientOnly: boolean
  canContinueOnline: boolean
}

/**
 * Après une première demande DO, le compte connecté reprend la souscription.
 * Le questionnaire d'étude reste un complément, le formulaire public aussi pour une autre opération.
 */
export function DevisDommageOuvrageClientGate({ children }: { children: ReactNode }) {
  const { status, data: session } = useSession()
  const userId = session?.user?.id ?? null
  const [resolved, setResolved] = useState<GateResolved | null>(null)
  const [showNewRequest, setShowNewRequest] = useState(false)

  useEffect(() => {
    if (status !== "authenticated" || !userId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/client/do-questionnaire")
        const j = (await res.json().catch(() => ({}))) as {
          useEspaceClientOnly?: boolean
          canContinueOnline?: boolean
        }
        if (!cancelled) {
          setResolved({
            userId,
            useEspaceClientOnly: Boolean(j.useEspaceClientOnly),
            canContinueOnline: Boolean(j.canContinueOnline),
          })
        }
      } catch {
        if (!cancelled) setResolved({ userId, useEspaceClientOnly: false, canContinueOnline: false })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [status, userId])

  if (status === "loading") {
    return <p className="text-black py-8">Chargement…</p>
  }

  if (status === "unauthenticated") {
    return <>{children}</>
  }

  if (!userId || !resolved || resolved.userId !== userId) {
    return <p className="text-black py-8">Chargement…</p>
  }

  if (resolved.useEspaceClientOnly && !showNewRequest) {
    return (
      <div className="rounded-2xl border border-[#2563eb]/30 bg-[#eff6ff] p-6 text-black shadow-sm">
        <h2 className="font-bold text-lg mb-2 text-[#0a0a0a]">Suite de votre dossier dommage ouvrage</h2>
        {resolved.canContinueOnline ? (
          <p className="mb-4 text-[#171717] leading-relaxed">
            Votre demande est enregistrée sur ce compte. Prochaine étape : finaliser la souscription. Le
            questionnaire d&apos;étude et les pièces complètent le dossier pendant l&apos;étude.
          </p>
        ) : (
          <p className="mb-4 text-[#171717] leading-relaxed">
            Votre demande est enregistrée. L&apos;équipe poursuit l&apos;étude et ajoute le devis dans l&apos;espace
            client. Vous pouvez déposer les pièces et compléter le questionnaire d&apos;étude.
          </p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {resolved.canContinueOnline ? (
            <Link
              href="/souscription-dommage-ouvrage"
              className="inline-flex items-center rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
            >
              Continuer la souscription
            </Link>
          ) : (
            <Link
              href="/espace-client"
              className="inline-flex items-center rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
            >
              Mon espace client
            </Link>
          )}
          <Link
            href="/espace-client/questionnaire-do-etude"
            className="inline-flex items-center rounded-xl border border-[#2563eb] px-4 py-2.5 text-sm font-semibold text-[#2563eb] hover:bg-white"
          >
            Questionnaire d&apos;étude
          </Link>
          {resolved.canContinueOnline ? (
            <Link href="/espace-client" className="inline-flex items-center text-sm font-semibold text-[#2563eb] hover:underline">
              Mon espace client
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => setShowNewRequest(true)}
            className="inline-flex items-center text-sm font-semibold text-[#171717] underline"
          >
            Déposer une autre demande
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
