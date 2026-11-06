import { LinkPilotDashboard } from "@/components/admin/seo/LinkPilotDashboard"

export const dynamic = "force-dynamic"

export default function LinkPilotPage() {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Suivi des liens</h1>
        <p className="mt-2 text-sm text-slate-600">
          Acquisition de liens, qualification des prospects et campagnes d&apos;approche validées par la gestion.
        </p>
      </div>
      <LinkPilotDashboard />
    </section>
  )
}
