"use client"

import { useState } from "react"

export function RegeneratePdfButton({ contractId }: { contractId: string }) {
  const [msg, setMsg] = useState<string | null>(null)
  return (
    <span>
      <button
        type="button"
        className="text-xs text-blue-600 underline"
        onClick={async () => {
          setMsg(null)
          const res = await fetch(`/api/contracts/${contractId}/regenerate`, { method: "POST" })
          setMsg(res.ok ? "OK" : "Erreur")
        }}
      >
        regénérer PDF
      </button>
      {msg && <span className="ml-1 text-xs text-slate-600">{msg}</span>}
    </span>
  )
}
