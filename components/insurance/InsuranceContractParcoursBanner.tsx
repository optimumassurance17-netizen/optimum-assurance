"use client"

import { CONTRACT_STATUS } from "@/lib/insurance-contract-status"
import type { InsuranceContractSnapshot } from "@/lib/insurance-contract-types"
import { PayInsuranceContractButton } from "@/components/insurance/PayInsuranceContractButton"

type Props = {
  snapshot: InsuranceContractSnapshot
}

export function InsuranceContractParcoursBanner({ snapshot }: Props) {
  const { contractNumber, status, rejectedReason, contractId } = snapshot

  if (status === CONTRACT_STATUS.rejected) {
    return (
      <div className="mb-8 p-5 rounded-2xl border border-red-200 bg-red-50 text-left">
        <p className="font-semibold text-red-900 mb-1">Dossier contrat plateforme — refus</p>
        <p className="text-sm text-red-800 mb-2">
          Contrat <span className="font-mono">{contractNumber}</span> : souscription non retenue.
        </p>
        {rejectedReason ? (
          <p className="text-sm text-red-900/90 whitespace-pre-wrap">{rejectedReason}</p>
        ) : null}
        <p className="text-sm text-red-800 mt-3">
          Vous pouvez poursuivre la signature du contrat « historique » ci-dessous ou contacter un conseiller.
        </p>
      </div>
    )
  }

  if (status === CONTRACT_STATUS.pending_validation) {
    return (
      <div className="mb-8 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-left">
        <p className="mb-1 font-semibold text-blue-950">Contrat en examen assureur</p>
        <p className="text-sm text-blue-900/90">
          N° <span className="font-mono">{contractNumber}</span> — votre dossier est en validation manuelle. Vous recevrez un email
          dès qu&apos;il sera accepté ; vous pourrez alors payer depuis votre espace client.
        </p>
      </div>
    )
  }

  if (status === CONTRACT_STATUS.approved) {
    return (
      <div className="mb-8 p-5 rounded-2xl border border-[#2563eb]/40 bg-[#eff6ff] text-left">
        <p className="font-semibold text-[#0a0a0a] mb-1">Paiement du contrat (virement)</p>
        <p className="text-sm text-[#171717] mb-4">
          Contrat <span className="font-mono">{contractNumber}</span> est prêt. Le lien Mollie n&apos;a pas pu s&apos;ouvrir ou a été
          fermé — vous pouvez lancer le virement depuis ce bouton.
        </p>
        <PayInsuranceContractButton contractId={contractId} />
      </div>
    )
  }

  if (status === CONTRACT_STATUS.active) {
    return (
      <div className="mb-8 p-5 rounded-2xl border border-emerald-200 bg-emerald-50 text-left">
        <p className="font-semibold text-emerald-900 mb-1">Contrat plateforme actif</p>
        <p className="text-sm text-emerald-900/90">
          N° <span className="font-mono">{contractNumber}</span> — après paiement, vos attestations sont disponibles dans l&apos;espace
          client (PDF).
        </p>
      </div>
    )
  }

  return null
}
