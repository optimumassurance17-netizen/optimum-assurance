import { LinkPilotDashboard } from "@/components/admin/seo/LinkPilotDashboard"

export const dynamic = "force-dynamic"

export default function LinkPilotPage() {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Optimum LinkPilot AI</h1>
        <p className="mt-2 text-sm text-slate-600">
          Pilotage acquisition backlinks SEO, qualification prospects et campagnes d&apos;outreach validées par l&apos;admin.
        </p>
      </div>
      <LinkPilotDashboard />
    </section>
  )
}
