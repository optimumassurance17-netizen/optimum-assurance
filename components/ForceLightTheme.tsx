"use client"

import { useEffect } from "react"

/** Désactive le mode sombre : plus de classe `dark` sur <html>, préférence uniquement clair. */
export function ForceLightTheme() {
  useEffect(() => {
    document.documentElement.classList.remove("dark")
    try {
      localStorage.removeItem("theme")
    } catch {
      /* ignore */
    }
  }, [])
  return null
}
