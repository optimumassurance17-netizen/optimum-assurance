"use client"

import Link from "next/link"
import { CONTRACT_STATUS } from "@/lib/insurance-contract-status"
import {
  insuranceProductHasBundledQuotePolicy,
  insuranceProductHasFic,
  insuranceProductHasSchedule,
} from "@/lib/insurance-product"

type Props = {
  contractId: string
  contractNumber: string
  status: string
  productType: string
  className?: string
}

const linkClass =
  "text-sm text-[#2563eb] font-medium hover:underline"

/**
 * Liens PDF authentifiés (session) — pas de doublon d’URL ailleurs.
 */
export function InsuranceContractPdfLinks({
  contractId,
  contractNumber,
  status,
  productType,
  className,
}: Props) {
  const base = `/api/contracts/${contractId}/pdf`
  const isActive = status === CONTRACT_STATUS.active
  const showQuarterlySchedule =
    insuranceProductHasSchedule(productType) &&
    (status === CONTRACT_STATUS.active || status === CONTRACT_STATUS.approved)
  const bundleDevisCp = insuranceProductHasBundledQuotePolicy(productType)
  const showFic = insuranceProductHasFic(productType)

  return (
    <div className={`flex flex-wrap gap-x-4 gap-y-2 items-center ${className ?? ""}`}>
      {bundleDevisCp ? (
        <a href={`${base}/quote`} target="_blank" rel="noreferrer" className={linkClass}>
          Devis et conditions (PDF)
        </a>
      ) : (
        <>
          <a href={`${base}/quote`} target="_blank" rel="noreferrer" className={linkClass}>
            Devis PDF
          </a>
          {showFic ? (
            <a href={`${base}/fic`} target="_blank" rel="noreferrer" className={linkClass}>
              FIC
            </a>
          ) : null}
          <a href={`${base}/policy`} target="_blank" rel="noreferrer" className={linkClass}>
            Conditions (CP)
          </a>
        </>
      )}
      {showQuarterlySchedule ? (
        <a href={`${base}/schedule`} target="_blank" rel="noreferrer" className={linkClass}>
          Échéancier (trimestriel)
        </a>
      ) : null}
      {isActive ? (
        <>
          <a href={`${base}/certificate`} target="_blank" rel="noreferrer" className={linkClass}>
            Attestation
          </a>
          <a href={`${base}/invoice`} target="_blank" rel="noreferrer" className={linkClass}>
            Facture
          </a>
        </>
      ) : null}
      <Link href={`/verify/${encodeURIComponent(contractNumber)}`} className={linkClass}>
        Vérification publique
      </Link>
    </div>
  )
}
