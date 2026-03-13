"use client"

const STEPS = [
  { id: "devis", label: "Devis", path: "/devis" },
  { id: "souscription", label: "Souscription", path: "/souscription" },
  { id: "compte", label: "Compte", path: "/creer-compte" },
  { id: "signature", label: "Signature", path: "/signature" },
  { id: "paiement", label: "Paiement", path: "/paiement" },
]

export function Stepper({ currentStep }: { currentStep: string }) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep)
  const progress = currentIndex >= 0 ? ((currentIndex + 1) / STEPS.length) * 100 : 0
  return (
    <div className="mb-10 p-6 bg-[#f5f5f5] rounded-2xl border border-[#d4d4d4] shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-medium text-[#171717]">
          Étape {currentIndex >= 0 ? currentIndex + 1 : 1} sur {STEPS.length}
        </span>
        <span className="text-sm font-semibold text-[#C65D3B]">{Math.round(progress)} %</span>
      </div>
      <div className="h-2 bg-[#e5e5e5] rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-[#C65D3B] rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between items-start">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  i < currentIndex
                    ? "bg-[#C65D3B] text-white"
                    : i === currentIndex
                    ? "bg-[#C65D3B] text-white ring-4 ring-[#C65D3B]/30 scale-110"
                    : "bg-[#e5e5e5] text-[#171717]"
                }`}
              >
                {i < currentIndex ? "✓" : i + 1}
              </div>
              <span className={`text-xs mt-2 hidden sm:block text-center font-medium ${i <= currentIndex ? "text-[#0a0a0a]" : "text-[#171717]"}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-1 mx-2 mt-5 rounded-full min-w-[8px] ${i < currentIndex ? "bg-[#C65D3B]" : "bg-[#e5e5e5]"}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
