import { ToxicLinksTable } from "@/components/admin/seo/ToxicLinksTable"

export const dynamic = "force-dynamic"

export default function SeoToxicLinksPage() {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Toxic links & domaines bloqués</h1>
        <p className="mt-2 text-sm text-slate-600">
          Gestion des domaines toxiques, motifs de blocage et spam score pour éviter un netlinking risqué.
        </p>
      </div>
      <ToxicLinksTable />
    </section>
  )
}
