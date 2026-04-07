"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import type { ReactNode } from "react"

/**
 * Si le client est connecté et qu’une 1ère demande DO est déjà connue, on oriente vers le questionnaire d’étude (espace client).
 */
export function DevisDommageOuvrageClientGate({ children }: { children: ReactNode }) {
  const { status } = useSession()
  const [mode, setMode] = useState<"load" | "public" | "redirect">("load")

  useEffect(() => {
    if (status === "unauthenticated") {
      setMode("public")
      return
    }
    if (status !== "authenticated") return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/client/do-questionnaire")
        const j = (await res.json().catch(() => ({}))) as { useEspaceClientOnly?: boolean }
        if (!cancelled) setMode(j.useEspaceClientOnly ? "redirect" : "public")
      } catch {
        if (!cancelled) setMode("public")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [status])

  if (mode === "load") {
    return <p className="text-black py-8">Chargement…</p>
  }

  if (mode === "redirect") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-black shadow-sm">
        <h2 className="font-bold text-lg mb-2 text-[#0a0a0a]">Suite de votre dossier dommage ouvrage</h2>
        <p className="mb-4 text-[#171717] leading-relaxed">
          Vous avez déjà transmis une première demande. Le questionnaire initial n&apos;est plus à refaire ici : complétez le{" "}
          <strong>questionnaire d&apos;étude</strong> depuis votre espace client. Les informations de votre premier envoi
          sont <strong>préremplies</strong> (vous pouvez les corriger et compléter les sections détaillées).
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <Link
            href="/espace-client/questionnaire-do-etude"
            className="inline-flex items-center rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
          >
            Questionnaire d&apos;étude
          </Link>
          <Link href="/espace-client" className="inline-flex items-center text-sm font-semibold text-[#2563eb] hover:underline">
            Mon espace client
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
