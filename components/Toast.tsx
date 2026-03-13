"use client"

import { useEffect } from "react"

interface ToastProps {
  message: string
  type?: "success" | "error"
  onClose: () => void
  duration?: number
}

export function Toast({ message, type = "success", onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [onClose, duration])

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-xl shadow-lg border ${
        type === "success"
          ? "bg-emerald-900/95 border-emerald-700 text-emerald-100"
          : "bg-red-900/95 border-red-700 text-red-100"
      }`}
      role="alert"
    >
      <p className="font-medium">{message}</p>
    </div>
  )
}
