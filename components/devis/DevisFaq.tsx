"use client"

import Link from "next/link"
import { faqDevis } from "@/lib/garanties-data"

export function DevisFaq() {
  return (
    <section className="mt-16 pt-8 border-t border-[#e5e5e5]">
      <h2 className="text-xl font-bold text-slate-900 mb-6">Questions frequentes</h2>
      <div className="space-y-4">
        {faqDevis.map((faq, i) => (
          <details key={i} className="bg-white rounded-xl border border-[#e5e5e5] overflow-hidden group">
            <summary className="px-5 py-4 font-medium text-slate-900 cursor-pointer list-none flex justify-between items-center hover:bg-blue-50/50 transition-colors [&::-webkit-details-marker]:hidden">
              {faq.q}
              <span className="text-blue-600 text-lg group-open:rotate-180 transition-transform">▾</span>
            </summary>
            <div className="px-5 pb-4 text-[#171717] text-sm leading-relaxed">
              {faq.r}
            </div>
          </details>
        ))}
      </div>
      <p className="text-center mt-6">
        <Link href="/faq" className="text-blue-600 font-medium hover:underline">Voir toutes les questions →</Link>
      </p>
    </section>
  )
}
