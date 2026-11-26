"use client"

const DECENNALE_STEPS = [
  { id: "devis", label: "Devis", path: "/devis" },
  { id: "souscription", label: "Souscription", path: "/souscription" },
  { id: "compte", label: "Compte", path: "/creer-compte" },
  { id: "signature", label: "Signature", path: "/signature" },
  { id: "mandat-sepa", label: "IBAN & SEPA", path: "/mandat-sepa" },
  { id: "paiement", label: "Paiement", path: "/paiement" },
]

/** Devis, compte automatique, souscription, puis virement unique. */
const DO_STEPS = [
  { id: "devis", label: "Devis", path: "/devis-dommage-ouvrage" },
  { id: "compte", label: "Compte", path: "/creer-compte" },
  { id: "souscription", label: "Souscription", path: "/souscription-dommage-ouvrage" },
  { id: "virement", label: "Virement", path: "/espace-client" },
]

export function Stepper({
  currentStep,
  parcours = "decennale",
}: {
  currentStep: string
  parcours?: "decennale" | "do"
}) {
  const steps = parcours === "do" ? DO_STEPS : DECENNALE_STEPS
  const currentIndex = steps.findIndex((s) => s.id === currentStep)
  const progress = currentIndex >= 0 ? ((currentIndex + 1) / steps.length) * 100 : 0
  return (
    <div className="mb-10 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">
          Étape {currentIndex >= 0 ? currentIndex + 1 : 1} sur {steps.length}
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
        {steps.map((step, i) => (
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
              <span className={`text-[10px] sm:text-xs mt-2 block text-center font-medium leading-tight ${i <= currentIndex ? "text-[#0a0a0a]" : "text-[#171717]"}`} title={step.label}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-2 mt-5 h-1 min-w-[8px] flex-1 rounded-full ${i < currentIndex ? "bg-blue-600" : "bg-slate-200"}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
