import { LEGAL_DELEGATION_MANDATORY } from "@/lib/legal-branding"

type Props = {
  className?: string
  size?: "sm" | "xs"
}

/** Ligne légale obligatoire — réutilisable (hero, pieds de page, cartes). */
export function DelegationLegalLine({ className = "", size = "sm" }: Props) {
  const textSize = size === "xs" ? "text-xs" : "text-sm"
  return (
    <p
      className={`${textSize} text-slate-700 font-medium leading-snug ${className}`.trim()}
    >
      {LEGAL_DELEGATION_MANDATORY}
    </p>
  )
}
