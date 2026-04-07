"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Header } from "@/components/Header"
import { Breadcrumb } from "@/components/Breadcrumb"
import { FormulaireDoEtudeEspaceClient } from "@/components/FormulaireDoEtudeEspaceClient"

export default function QuestionnaireDoEtudePage() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/connexion?callbackUrl=/espace-client/questionnaire-do-etude")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-[var(--background)] flex items-center justify-center">
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <Breadcrumb
          items={[
            { label: "Accueil", href: "/" },
            { label: "Espace client", href: "/espace-client" },
            { label: "Questionnaire d’étude DO" },
          ]}
        />
        <h1 className="text-2xl md:text-3xl font-bold text-[#0a0a0a] mt-4 mb-2">Questionnaire d’étude — dommages ouvrage</h1>
        <p className="text-[#525252] text-sm mb-8">
          Réservé à l&apos;espace client, après votre première demande de devis. Les réponses du questionnaire initial sont reprises ci-dessous lorsque c&apos;est possible.
        </p>
        <FormulaireDoEtudeEspaceClient />
      </div>
    </main>
  )
}
