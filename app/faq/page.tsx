"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Header } from "@/components/Header"
import { faqs } from "@/lib/faq-data"

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  useEffect(() => {
    if (typeof window === "undefined" || !window.location.hash) return
    const id = window.location.hash.slice(1)
    const idx = faqs.findIndex((f) => (f as { id?: string }).id === id)
    if (idx >= 0) queueMicrotask(() => setOpenIndex(idx))
  }, [])

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold mb-2 text-[#0a0a0a]">Questions fréquentes</h1>
        <p className="text-[#171717] mb-8">
          Retrouvez les réponses sur l&apos;assurance décennale, le dommage ouvrage et les parcours de souscription.
          Liens directs :{" "}
          <a href="#parcours-client" className="text-[#2563eb] font-medium hover:underline">parcours client</a>
          {" · "}
          <a href="#parcours-do" className="text-[#2563eb] font-medium hover:underline">parcours DO</a>
          {" · "}
          <a href="#parcours-decennale" className="text-[#2563eb] font-medium hover:underline">parcours décennale</a>
          .
        </p>
        <div className="grid gap-3 sm:grid-cols-2 mb-8">
          <Link
            href="/guides/obligation-decennale"
            className="rounded-xl border border-slate-200 bg-white p-4 hover:border-[#2563eb]/40 hover:bg-slate-50 transition-all"
          >
            <p className="font-semibold text-[#0a0a0a]">Guide obligation décennale</p>
            <p className="mt-1 text-sm text-[#171717]">Sanctions, attestation et professionnels concernés.</p>
          </Link>
          <Link
            href="/guides/obligation-dommage-ouvrage"
            className="rounded-xl border border-slate-200 bg-white p-4 hover:border-[#2563eb]/40 hover:bg-slate-50 transition-all"
          >
            <p className="font-semibold text-[#0a0a0a]">Guide obligation dommage ouvrage</p>
            <p className="mt-1 text-sm text-[#171717]">Quand souscrire et pour quels maîtres d&apos;ouvrage.</p>
          </Link>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => {
            const faqId = (faq as { id?: string }).id || `faq-${i}`
            const isOpen = openIndex === i
            return (
              <div key={i} id={faqId} className="bg-white border border-slate-200 rounded-xl overflow-hidden scroll-mt-24">
                <button
                  type="button"
                  id={`faq-question-${faqId}`}
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full text-left px-6 py-4 font-medium text-[#0a0a0a] flex justify-between items-center hover:bg-slate-100"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${faqId}`}
                >
                  {faq.q}
                  <span className="text-[#2563eb] text-xl" aria-hidden="true">{isOpen ? "−" : "+"}</span>
                </button>
                <div
                  id={`faq-answer-${faqId}`}
                  className={`grid px-6 text-sm text-[#171717] leading-relaxed transition-[grid-template-rows,padding-bottom] duration-200 ${
                    isOpen ? "grid-rows-[1fr] pb-4" : "grid-rows-[0fr] pb-0"
                  }`}
                  role="region"
                  aria-labelledby={`faq-question-${faqId}`}
                  aria-hidden={!isOpen}
                >
                  <div className="overflow-hidden">
                    {faq.r}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <Link href="/devis" className="text-[#2563eb] font-medium hover:underline">Obtenir un devis →</Link>
          <span className="text-[#333333]">|</span>
          <Link href="/guides" className="text-[#2563eb] font-medium hover:underline">Guides pratiques →</Link>
        </div>
      </div>
    </main>
  )
}
