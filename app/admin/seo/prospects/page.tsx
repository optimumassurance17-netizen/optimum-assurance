import { ProspectsTable } from "@/components/admin/seo/ProspectsTable"

export const dynamic = "force-dynamic"

export default function SeoProspectsPage() {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Prospects backlinks</h1>
        <p className="mt-2 text-sm text-slate-600">
          Gestion CRUD, scoring IA, brouillons d&apos;outreach, conversion en backlinks acquis.
        </p>
      </div>
      <ProspectsTable />
    </section>
  )
}
