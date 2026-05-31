import { BacklinksTable } from "@/components/admin/seo/BacklinksTable"

export const dynamic = "force-dynamic"

export default function SeoBacklinksPage() {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Backlinks acquis</h1>
        <p className="mt-2 text-sm text-slate-600">
          Suivi des liens obtenus, type de lien, statut actif/perdu/en attente, vérification manuelle.
        </p>
      </div>
      <BacklinksTable />
    </section>
  )
}
