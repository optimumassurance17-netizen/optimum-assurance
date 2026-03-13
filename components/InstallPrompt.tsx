"use client"

import { useEffect, useState } from "react"

const STORAGE_KEY = "optimum-install-prompt-dismissed"

export function InstallPrompt() {
  const [visible, setVisible] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<{
    prompt: () => Promise<{ outcome: string }>
  } | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    // Déjà installé (mode standalone)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true

    if (isStandalone) return

    // Déjà fermé par l'utilisateur
    if (localStorage.getItem(STORAGE_KEY)) return

    // Détection mobile
    const ua = navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    const android = /Android/.test(ua)

    if (!ios && !android) return

    // Pas sur mobile tactile (optionnel : largeur < 768)
    const isMobile = window.innerWidth < 768 || ios || android
    if (!isMobile) return

    setIsIOS(ios)
    setIsAndroid(android)

    // Android : écouter beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as unknown as { prompt: () => Promise<{ outcome: string }> })
    }
    window.addEventListener("beforeinstallprompt", handler)

    // Afficher après un court délai (éviter le flash au chargement)
    const timer = setTimeout(() => setVisible(true), 2000)

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
      clearTimeout(timer)
    }
  }, [])

  const handleDismiss = () => {
    setVisible(false)
    localStorage.setItem(STORAGE_KEY, "1")
  }

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      handleDismiss()
    }
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-6 md:max-w-sm">
      <div className="bg-white border border-[#d4d4d4] rounded-2xl p-4 shadow-xl shadow-black/10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[#0a0a0a] mb-1">Installer l&apos;app</p>
            <p className="text-sm text-[#171717]">
              {isIOS && (
                <>
                  Touchez <span className="font-medium">Partager</span> puis{" "}
                  <span className="font-medium">Sur l&apos;écran d&apos;accueil</span> pour un accès rapide.
                </>
              )}
              {isAndroid && !deferredPrompt && (
                <>
                  Menu <span className="font-medium">⋮</span> →{" "}
                  <span className="font-medium">Ajouter à l&apos;écran d&apos;accueil</span>
                </>
              )}
              {isAndroid && deferredPrompt && (
                <>Installez l&apos;app pour un accès rapide à votre espace client.</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {deferredPrompt && (
              <button
                onClick={handleInstall}
                className="px-4 py-2 bg-[#C65D3B] text-white text-sm font-medium rounded-xl hover:bg-[#B04F2F] transition-colors"
              >
                Installer
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="p-2 text-[#737373] hover:text-[#0a0a0a] rounded-lg transition-colors"
              aria-label="Fermer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
