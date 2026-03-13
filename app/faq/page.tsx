"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Header } from "@/components/Header"
import { faqs } from "@/lib/faq-data"

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const id = window.location.hash.slice(1)
      const idx = faqs.findIndex((f) => (f as { id?: string }).id === id)
      if (idx >= 0) setOpenIndex(idx)
    }
  }, [])

  return (
    <main className="min-h-screen bg-[#FDF8F3] dark:bg-gray-900">
      <Header />
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold mb-2 text-[#0a0a0a] dark:text-white">Questions fréquentes</h1>
        <p className="text-[#171717] dark:text-gray-300 mb-8">Retrouvez les réponses aux questions les plus posées sur l&apos;assurance décennale et le parcours de souscription.</p>
        <div className="space-y-3">
          {faqs.map((faq, i) => {
            const faqId = (faq as { id?: string }).id || `faq-${i}`
            const isOpen = openIndex === i
            return (
              <div key={i} id={faqId} className="bg-white dark:bg-gray-800 border border-[#F0EBE3] dark:border-gray-700 rounded-xl overflow-hidden scroll-mt-24">
                <button
                  type="button"
                  id={`faq-question-${faqId}`}
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full text-left px-6 py-4 font-medium text-[#0a0a0a] dark:text-white flex justify-between items-center hover:bg-[#F9F6F0] dark:hover:bg-gray-700"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${faqId}`}
                >
                  {faq.q}
                  <span className="text-[#C65D3B] text-xl" aria-hidden="true">{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && (
                  <div id={`faq-answer-${faqId}`} className="px-6 pb-4 text-[#171717] dark:text-gray-300 text-sm leading-relaxed" role="region" aria-labelledby={`faq-question-${faqId}`}>
                    {faq.r}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <Link href="/devis" className="text-[#C65D3B] font-medium hover:underline">Obtenir un devis →</Link>
          <span className="text-[#a3a3a3]">|</span>
          <Link href="/guides" className="text-[#C65D3B] font-medium hover:underline">Guides pratiques →</Link>
        </div>
      </div>
    </main>
  )
}
