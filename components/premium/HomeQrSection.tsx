/** Mock visuel QR (grille) — le vrai QR est sur le PDF d’attestation. */
function QrMock() {
  const cells = Array.from({ length: 64 }, (_, i) => i)
  return (
    <div
      className="grid grid-cols-8 gap-0.5 rounded-xl bg-white p-3 shadow-inner border border-slate-200"
      aria-hidden
    >
      {cells.map((i) => (
        <div
          key={i}
          className={`aspect-square rounded-[1px] ${i % 7 === 0 || i % 5 === 1 || i > 40 ? "bg-slate-900" : "bg-slate-200"}`}
        />
      ))}
    </div>
  )
}

export function HomeQrSection() {
  return (
    <section className="px-4 sm:px-6 md:px-8 py-16 md:py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\'%3E%3Cpath fill=\'%23ffffff\' fill-opacity=\'0.04\' d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/svg%3E')] opacity-60" />
      <div className="max-w-6xl mx-auto relative grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div>
          <p className="text-blue-300 text-sm font-semibold uppercase tracking-wider mb-3">Différenciation</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Attestation vérifiable instantanément
          </h2>
          <p className="text-slate-200 text-lg leading-relaxed mb-6">
            Chaque document comporte un lien et un QR code menant à une page publique de contrôle. Vos clients
            vérifient en un scan que l&apos;attestation est authentique et que le contrat est actif.
          </p>
          <ul className="space-y-3 text-slate-200">
            <li className="flex gap-3 items-start">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                ✓
              </span>
              <span>Lutte contre la fraude documentaire</span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                ✓
              </span>
              <span>Traçabilité et confiance sur vos chantiers</span>
            </li>
          </ul>
        </div>
        <div className="flex justify-center lg:justify-end">
          <div className="rounded-3xl bg-white/10 backdrop-blur-md border border-white/15 p-8 shadow-2xl max-w-sm w-full">
            <p className="text-center text-sm font-medium text-slate-300 mb-4">Aperçu — QR sur attestation</p>
            <div className="flex justify-center mb-6">
              <QrMock />
            </div>
            <p className="text-center text-xs text-slate-300 leading-relaxed">
              En production, le QR encode l&apos;URL de vérification officielle (contrat actif / produit).
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
