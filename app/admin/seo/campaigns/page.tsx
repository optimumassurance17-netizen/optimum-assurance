import { CampaignsTable } from "@/components/admin/seo/CampaignsTable"

export const dynamic = "force-dynamic"

export default function SeoCampaignsPage() {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Campaigns outreach</h1>
        <p className="mt-2 text-sm text-slate-600">
          Création et suivi des campagnes (draft/active/paused/completed), modèles email IA, ciblage par catégorie.
        </p>
      </div>
      <CampaignsTable />
    </section>
  )
}
