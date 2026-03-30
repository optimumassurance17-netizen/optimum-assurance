"use client"

const STEPS = [
  { id: "devis", label: "Devis", path: "/devis" },
  { id: "souscription", label: "Souscription", path: "/souscription" },
  { id: "compte", label: "Compte", path: "/creer-compte" },
  { id: "signature", label: "Signature", path: "/signature" },
  { id: "mandat-sepa", label: "IBAN & SEPA", path: "/mandat-sepa" },
  { id: "paiement", label: "Paiement", path: "/paiement" },
]

export function Stepper({ currentStep }: { currentStep: string }) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep)
  const progress = currentIndex >= 0 ? ((currentIndex + 1) / STEPS.length) * 100 : 0
  return (
    <div className="mb-10 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">
          Étape {currentIndex >= 0 ? currentIndex + 1 : 1} sur {STEPS.length}
        </span>
        <span className="text-sm font-semibold text-blue-600">{Math.round(progress)} %</span>
      </div>
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between items-start">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                  i < currentIndex
                    ? "bg-blue-600 text-white"
                    : i === currentIndex
                    ? "scale-110 bg-blue-600 text-white ring-4 ring-blue-600/30"
                    : "bg-slate-200 text-slate-800"
                }`}
              >
                {i < currentIndex ? "✓" : i + 1}
              </div>
              <span className={`text-[10px] sm:text-xs mt-2 block text-center font-medium truncate max-w-full ${i <= currentIndex ? "text-[#0a0a0a]" : "text-[#171717]"}`} title={step.label}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mx-2 mt-5 h-1 min-w-[8px] flex-1 rounded-full ${i < currentIndex ? "bg-blue-600" : "bg-slate-200"}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
