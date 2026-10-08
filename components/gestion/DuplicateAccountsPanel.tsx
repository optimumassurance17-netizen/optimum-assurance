"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { readResponseJson } from "@/lib/read-response-json"

type DuplicateMember = {
  id: string
  email: string
  raisonSociale: string | null
  siret: string | null
  createdAt: string
}

type DuplicateGroup = {
  id: string
  kind: "email" | "siret"
  key: string
  keepId: string
  members: DuplicateMember[]
}

type Toast = { message: string; type?: "success" | "warning" | "error" }

export function DuplicateAccountsPanel({
  setToast,
  onMerged,
}: {
  setToast: (toast: Toast) => void
  onMerged?: () => Promise<void> | void
}) {
  const [groups, setGroups] = useState<DuplicateGroup[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch("/api/gestion/clients/duplicates")
    if (!res.ok) return
    const body = await readResponseJson<{ groups?: DuplicateGroup[] }>(res)
    setGroups(body.groups ?? [])
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch("/api/gestion/clients/duplicates")
        if (!res.ok || cancelled) return
        const body = await readResponseJson<{ groups?: DuplicateGroup[] }>(res)
        if (!cancelled) setGroups(body.groups ?? [])
      } catch {
        if (!cancelled) setGroups([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!groups || groups.length === 0) return null

  const merge = async (group: DuplicateGroup) => {
    const keeper = group.members.find((member) => member.id === group.keepId) ?? group.members[0]
    const others = group.members.filter((member) => member.id !== keeper?.id)
    if (!keeper || others.length === 0) return
    const confirmed = window.confirm(
      `Fusionner ${others.map((member) => member.email).join(", ")} dans ${keeper.email} ? Les autres fiches seront supprimées. Les documents et paiements suivent la fiche conservée.`
    )
    if (!confirmed) return
    setBusyId(group.id)
    try {
      const res = await fetch("/api/gestion/clients/duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keepId: keeper.id,
          mergeIds: others.map((member) => member.id),
        }),
      })
      const body = await readResponseJson<{ error?: string }>(res)
      if (!res.ok) throw new Error(body.error || "Fusion impossible")
      setToast({ message: `Comptes réunis dans ${keeper.email}.`, type: "success" })
      await load()
      await onMerged?.()
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Fusion impossible",
        type: "error",
      })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section id="doublons" className="scroll-mt-24">
      <h2 className="text-lg font-semibold text-white mb-2">Comptes en double</h2>
      <p className="text-sm text-gray-300 mb-4">
        Même email, sans tenir compte de la casse, ou même SIRET. La fusion garde la fiche la plus ancienne.
      </p>
      <div className="space-y-3">
        {groups.map((group) => {
          const keeper = group.members.find((member) => member.id === group.keepId)
          return (
            <div key={group.id} className="rounded-xl border border-amber-800/60 bg-[#252525] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-amber-100">
                    {group.kind === "email" ? "Même email" : "Même SIRET"} · {group.key}
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-gray-200">
                    {group.members.map((member) => (
                      <li key={member.id}>
                        <span className="text-gray-400">
                          {member.id === group.keepId ? "Conservée" : "À supprimer"}
                        </span>
                        {" — "}
                        {member.raisonSociale || "—"} — {member.email}
                        {member.siret ? ` — ${member.siret}` : ""}
                        {" — "}
                        {new Date(member.createdAt).toLocaleDateString("fr-FR")}
                        {" "}
                        <Link href={`/gestion/clients/${member.id}`} className="text-[#60a5fa] hover:underline">
                          Fiche
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  disabled={busyId !== null || !keeper}
                  onClick={() => void merge(group)}
                  className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  {busyId === group.id ? "Fusion…" : "Fusionner dans la plus ancienne"}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
