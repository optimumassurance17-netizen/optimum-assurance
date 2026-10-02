"use client"

import { useEffect } from "react"

interface ToastProps {
  message: string
  type?: "success" | "warning" | "error"
  onClose: () => void
  duration?: number
}

export function Toast({ message, type = "success", onClose, duration = 4000 }: ToastProps) {
  const holdsPassword = message.includes("Mot de passe temporaire")
  const visibleFor = holdsPassword ? 120000 : duration

  useEffect(() => {
    const t = setTimeout(onClose, visibleFor)
    return () => clearTimeout(t)
  }, [onClose, visibleFor])

  const tone =
    type === "error"
      ? "bg-red-900/95 border-red-700 text-red-100"
      : type === "warning"
        ? "bg-amber-900/95 border-amber-700 text-amber-100"
        : "bg-emerald-900/95 border-emerald-700 text-emerald-100"

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-xl shadow-lg border ${tone}`}
      role={type === "error" ? "alert" : "status"}
    >
      <p className="font-medium">{message}</p>
      {holdsPassword ? (
        <button type="button" onClick={onClose} className="mt-2 text-xs underline">
          Fermer
        </button>
      ) : null}
    </div>
  )
}
