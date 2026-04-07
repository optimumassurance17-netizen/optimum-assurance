"use client"

import { Header } from "@/components/Header"
import { RcProForm } from "@/src/modules/rcpro/components/RcProForm"

export default function RcProDevisPage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Header />
      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-bold text-[#0a0a0a]">Devis RC Pro</h1>
        <p className="mb-8 text-[#171717]">
          Responsabilite Civile Professionnelle (hors batiment). Obtenez un tarif indicatif en quelques etapes.
        </p>
        <RcProForm />
      </div>
    </main>
  )
}
