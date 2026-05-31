import { DashboardShell } from "@/optimum-geo-intelligence/components/dashboard-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/optimum-geo-intelligence/components/ui/card"

export const dynamic = "force-dynamic"

function status(value: string | undefined) {
  return value?.trim() ? "Configuré" : "Manquant"
}

export default function DashboardSettingsPage() {
  const rows = [
    ["NEXT_PUBLIC_SUPABASE_URL", status(process.env.NEXT_PUBLIC_SUPABASE_URL)],
    ["SUPABASE_SERVICE_ROLE_KEY", status(process.env.SUPABASE_SERVICE_ROLE_KEY)],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", status(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)],
    ["OPENAI_API_KEY", status(process.env.OPENAI_API_KEY)],
    ["FIRECRAWL_API_KEY", status(process.env.FIRECRAWL_API_KEY)],
    ["CRON_SECRET", status(process.env.CRON_SECRET)],
    ["ALERTS_EMAIL_TO", status(process.env.ALERTS_EMAIL_TO)],
  ] as const

  return (
    <DashboardShell pathname="/dashboard/settings">
      <Card>
        <CardHeader>
          <CardTitle>Paramètres & sécurité</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-slate-600">
            Vérification rapide des variables d&apos;environnement nécessaires au module OPTIMUM GEO INTELLIGENCE.
          </p>
          <p className="mb-4 text-sm text-slate-600">
            Mode prod activé : les crons de contenu et d&apos;optimisation appliquent une validation automatique sur
            les contenus générés quand les variables ci-dessous sont configurées.
          </p>
          <div className="space-y-2">
            {rows.map(([key, value]) => (
              <div key={key} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="font-mono text-xs text-slate-700">{key}</span>
                <span className={`text-xs font-semibold ${value === "Configuré" ? "text-emerald-700" : "text-red-700"}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  )
}
