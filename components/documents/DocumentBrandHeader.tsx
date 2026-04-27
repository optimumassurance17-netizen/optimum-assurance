"use client"

import { useState } from "react"
import Image from "next/image"
import {
  COMPANY_BRAND,
  INSURER_NAME,
  LEGAL_DELEGATION_MANDATORY,
  LEGAL_ORIAS_LINE,
} from "@/lib/legal-branding"

type DocumentBrandHeaderProps = {
  tagline: string
  className?: string
}

const ACCELERANT_LOGO_SRC = "/branding/accelerant-logo.png"

export function DocumentBrandHeader({ tagline, className }: DocumentBrandHeaderProps) {
  const [logoBroken, setLogoBroken] = useState(false)

  return (
    <div className={className ?? "border-b-2 border-[#2563eb] pb-4 mb-6"}>
      <div className="mb-3 flex items-center justify-center">
        {logoBroken ? (
          <div className="rounded border border-[#cbd5e1] px-3 py-1 text-xs font-semibold text-[#0f172a]">
            {INSURER_NAME}
          </div>
        ) : (
          <Image
            src={ACCELERANT_LOGO_SRC}
            alt="Logo Accelerant Insurance"
            width={168}
            height={42}
            className="h-10 w-auto object-contain"
            onError={() => setLogoBroken(true)}
            priority
          />
        )}
      </div>

      <h1 className="text-xl font-bold text-[#2563eb]">{COMPANY_BRAND}</h1>
      <p className="text-sm font-semibold text-[#171717] mt-1">{tagline}</p>
      <p className="text-xs text-[#171717] mt-1">
        Assureur : {INSURER_NAME} — {LEGAL_ORIAS_LINE}
      </p>
      <p className="text-xs text-[#171717]">{LEGAL_DELEGATION_MANDATORY}</p>
    </div>
  )
}
