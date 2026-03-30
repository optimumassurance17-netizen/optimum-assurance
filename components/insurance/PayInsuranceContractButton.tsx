"use client"

import { useState } from "react"
import { persistMollieInsurancePaymentId, startMollieInsurancePayment } from "@/lib/souscription-insurance-contract"

type Props = {
  contractId: string
  className?: string
  label?: string
}

export function PayInsuranceContractButton({
  contractId,
  className = "inline-flex items-center justify-center bg-[#2563eb] text-white px-5 py-2.5 rounded-xl hover:bg-[#1d4ed8] font-medium text-sm transition-colors disabled:opacity-50",
  label = "Payer par virement (Mollie)",
}: Props) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={loading}
        onClick={async () => {
          setLoading(true)
          setErr(null)
          try {
            const r = await startMollieInsurancePayment(contractId)
            if (!r.ok) {
              setErr(r.error)
              return
            }
            persistMollieInsurancePaymentId(r.paymentId)
            window.location.href = r.checkoutUrl
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Erreur")
          } finally {
            setLoading(false)
          }
        }}
        className={className}
      >
        {loading ? "Redirection…" : label}
      </button>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
    </div>
  )
}
