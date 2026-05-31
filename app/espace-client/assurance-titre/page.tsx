"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/Header"
import { Breadcrumb } from "@/components/Breadcrumb"
import { FormulaireAssuranceTitreEspaceClient } from "@/components/FormulaireAssuranceTitreEspaceClient"

export default function AssuranceTitreEspaceClientPage() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/connexion?callbackUrl=/espace-client/assurance-titre")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <p className="text-[#171717]">Chargement…</p>
      </main>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Header />
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <Breadcrumb
          items={[
            { label: "Accueil", href: "/" },
            { label: "Espace client", href: "/espace-client" },
            { label: "Assurance titre" },
          ]}
        />
        <h1 className="mt-4 mb-2 text-2xl font-bold text-[#0a0a0a] md:text-3xl">
          Questionnaire d’étude — Assurance titre
        </h1>
        <p className="mb-8 text-sm text-[#525252]">
          Réservé à votre espace client, après la première demande publique. Complétez ici le dossier, les parties
          prenantes et les éléments de risque, puis déposez vos pièces dans l’espace client.
        </p>
        <FormulaireAssuranceTitreEspaceClient />
      </div>
    </main>
  )
}
