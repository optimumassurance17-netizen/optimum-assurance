"use client"

import { useEffect, useState } from "react"

export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const isDark = stored === "dark" || (!stored && prefersDark)
    setDark(isDark)
    document.documentElement.classList.toggle("dark", isDark)
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("theme", next ? "dark" : "light")
  }

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg text-[#171717] hover:text-black hover:bg-[#F0EBE3] dark:hover:text-white dark:hover:bg-gray-700"
      aria-label={dark ? "Mode clair" : "Mode sombre"}
    >
      {dark ? "☀️" : "🌙"}
    </button>
  )
}
