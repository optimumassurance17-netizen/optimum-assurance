import { ToxicLinksTable } from "@/components/admin/seo/ToxicLinksTable"

export const dynamic = "force-dynamic"

export default function SeoToxicLinksPage() {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Liens toxiques et domaines bloqués</h1>
        <p className="mt-2 text-sm text-slate-600">
          Gestion des domaines toxiques, motifs de blocage et score d&apos;indésirabilité pour éviter un maillage risqué.
        </p>
      </div>
      <ToxicLinksTable />
    </section>
  )
}
