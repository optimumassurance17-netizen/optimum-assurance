"use client"

import Link from "next/link"
import { getDevoirConseilContent } from "@/lib/devoir-conseil"

type Produit = "decennale" | "dommage-ouvrage"

interface DevoirConseilProps {
  produit: Produit
  checkboxId: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  /** Texte du bouton/action bloquée si non coché */
  labelCheckbox: string
  /** Si true, le bloc est compact (pour intégration dans un formulaire) */
  compact?: boolean
}

export function DevoirConseil({
  produit,
  checkboxId,
  checked,
  onCheckedChange,
  labelCheckbox,
  compact = false,
}: DevoirConseilProps) {
  const texte = getDevoirConseilContent(produit)

  return (
    <div
      className={`rounded-xl border-2 ${checked ? "border-[#2563eb]/40 bg-[#eff6ff]/50" : "border-slate-300 bg-slate-50"} p-4`}
      role="region"
      aria-labelledby={`${checkboxId}-title`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id={checkboxId}
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="mt-1 w-5 h-5 shrink-0 rounded text-[#2563eb] focus:ring-[#2563eb]"
          aria-describedby={`${checkboxId}-desc`}
        />
        <div className="min-w-0">
          <p id={`${checkboxId}-title`} className="font-semibold text-[#0a0a0a]">
            {texte.titre}
          </p>
          <p id={`${checkboxId}-desc`} className={`text-[#171717] ${compact ? "text-sm mt-1" : "text-sm mt-2 leading-relaxed"}`}>
            {texte.contenu}
          </p>
          <p className="mt-2 text-sm">
            <Link href={texte.lienCgv} className="text-[#2563eb] font-medium hover:underline">
              CGV
            </Link>
            {" · "}
            <Link href={texte.lienAttestations} className="text-[#2563eb] font-medium hover:underline">
              Attestations
            </Link>
            {" · "}
            <Link href={texte.lienFaq} className="text-[#2563eb] font-medium hover:underline">
              FAQ
            </Link>
            {" · "}
            <Link href={texte.lienGuide} className="text-[#2563eb] font-medium hover:underline">
              Guide obligation
            </Link>
          </p>
          <label htmlFor={checkboxId} className="mt-2 block text-sm font-medium text-[#0a0a0a] cursor-pointer">
            {labelCheckbox}
          </label>
        </div>
      </div>
    </div>
  )
}
