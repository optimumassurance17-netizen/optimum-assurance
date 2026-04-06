const ITEMS = [
  { k: "ORIAS", v: "LPS 28931947" },
  { k: "Assureur", v: "Accelerant Insurance" },
  { k: "Paiement", v: "Sécurisé (Mollie)" },
  { k: "Régulation", v: "Conforme cadre ACPR" },
] as const

export function TrustBar() {
  return (
    <div className="border-y border-slate-200/80 bg-white/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 sm:justify-between">
          {ITEMS.map((item) => (
            <div
              key={item.k}
              className="flex items-baseline gap-2 text-center sm:text-left"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                {item.k}
              </span>
              <span className="text-sm font-semibold text-slate-900">{item.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
