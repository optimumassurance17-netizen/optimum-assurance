"use client"

import Link from "next/link"

type Produit = "decennale" | "dommage-ouvrage"

const TEXTE_DECENNALE = {
  titre: "Devoir de conseil",
  contenu:
    "En souscrivant, vous confirmez avoir pris connaissance des garanties, exclusions et franchises de votre contrat. Le devis a été établi selon les informations que vous avez fournies. Si votre situation change ou si vous avez des questions, contactez-nous avant de signer.",
  lienCgv: "/cgv",
  lienFaq: "/faq",
  lienGuide: "/guides/obligation-decennale",
}

const TEXTE_DO = {
  titre: "Devoir de conseil",
  contenu:
    "En validant cette demande, vous confirmez avoir pris connaissance des garanties, exclusions et conditions de l'assurance dommage ouvrage. Le devis sera établi selon les informations fournies. Consultez nos guides et la FAQ si vous avez des questions avant de vous engager.",
  lienCgv: "/cgv",
  lienFaq: "/faq",
  lienGuide: "/guides/obligation-dommage-ouvrage",
}

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
  const texte = produit === "decennale" ? TEXTE_DECENNALE : TEXTE_DO

  return (
    <div
      className={`rounded-xl border-2 ${checked ? "border-[#C65D3B]/40 bg-[#FEF3F0]/50" : "border-amber-300 bg-amber-50/80"} p-4`}
      role="region"
      aria-labelledby={`${checkboxId}-title`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id={checkboxId}
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="mt-1 w-5 h-5 shrink-0 rounded text-[#C65D3B] focus:ring-[#C65D3B]"
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
            <Link href={texte.lienCgv} className="text-[#C65D3B] font-medium hover:underline">
              CGV
            </Link>
            {" · "}
            <Link href={texte.lienFaq} className="text-[#C65D3B] font-medium hover:underline">
              FAQ
            </Link>
            {" · "}
            <Link href={texte.lienGuide} className="text-[#C65D3B] font-medium hover:underline">
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
