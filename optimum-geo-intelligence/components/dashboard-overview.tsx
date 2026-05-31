"use client"

import { Loader2, RefreshCcw } from "lucide-react"
import { useOgiAction, useOgiDashboard } from "@/optimum-geo-intelligence/client/hooks"
import { AlertsPanel } from "@/optimum-geo-intelligence/components/alerts-panel"
import { ScoreCard } from "@/optimum-geo-intelligence/components/score-card"
import { TrendChart } from "@/optimum-geo-intelligence/components/trend-chart"
import { VisibilityPanel } from "@/optimum-geo-intelligence/components/visibility-panel"
import { Button } from "@/optimum-geo-intelligence/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/optimum-geo-intelligence/components/ui/card"
import { Table, Tbody, Td, Th, Thead, Tr } from "@/optimum-geo-intelligence/components/ui/table"

function ActionButton({
  label,
  pending,
  onClick,
}: {
  label: string
  pending: boolean
  onClick: () => Promise<void> | void
}) {
  return (
    <Button onClick={() => void onClick()} disabled={pending} className="w-full sm:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
      {label}
    </Button>
  )
}

export function DashboardOverview() {
  const dashboard = useOgiDashboard()
  const competitors = useOgiAction("competitors/scan")
  const geo = useOgiAction("geo/analyze")
  const seo = useOgiAction("seo/scan")
  const alerts = useOgiAction("alerts/run")
  const scores = useOgiAction("score/recompute")

  if (dashboard.isLoading) {
    return <p className="rounded-xl bg-white p-6 text-sm text-slate-600">Chargement du dashboard GEO Intelligence…</p>
  }

  if (dashboard.isError || !dashboard.data) {
    return <p className="rounded-xl bg-red-50 p-6 text-sm text-red-700">Impossible de charger les données.</p>
  }

  const { snapshot, alerts: alertList, competitors: competitorList } = dashboard.data

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ScoreCard title="GEO Score global" description="Score consolidé IA + SEO" value={snapshot.geoScoreGlobal} />
        <ScoreCard title="SEO Score global" description="Qualité des pages indexables" value={snapshot.seoScoreGlobal} />
        <ScoreCard title="Fraîcheur contenu" description="Actualité éditoriale moyenne" value={snapshot.contentFreshness} />
        <ScoreCard title="Alertes actives" description="Actions à traiter" value={snapshot.activeAlerts} />
      </div>

      <div className="flex flex-wrap gap-2">
        <ActionButton
          label="Relancer veille concurrentielle"
          pending={competitors.isPending}
          onClick={async () => {
            await competitors.mutateAsync({})
          }}
        />
        <ActionButton
          label="Relancer analyse GEO"
          pending={geo.isPending}
          onClick={async () => {
            await geo.mutateAsync({})
          }}
        />
        <ActionButton
          label="Relancer scan SEO"
          pending={seo.isPending}
          onClick={async () => {
            await seo.mutateAsync({})
          }}
        />
        <ActionButton
          label="Déclencher alertes"
          pending={alerts.isPending}
          onClick={async () => {
            await alerts.mutateAsync({})
          }}
        />
        <ActionButton
          label="Recalculer scores"
          pending={scores.isPending}
          onClick={async () => {
            await scores.mutateAsync({})
          }}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <TrendChart points={snapshot.trend7d} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Évolution concurrentielle (derniers crawls)</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <Thead>
                  <Tr>
                    <Th>Concurrents</Th>
                    <Th>URL</Th>
                    <Th>SEO score</Th>
                    <Th>Statut</Th>
                    <Th>Date</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {competitorList.slice(0, 12).map((row) => (
                    <Tr key={row.id}>
                      <Td>{row.competitors?.name ?? "—"}</Td>
                      <Td className="max-w-[340px] truncate">{row.url}</Td>
                      <Td>{row.seo_score}</Td>
                      <Td>{row.is_new ? "Nouveau" : "Mis à jour"}</Td>
                      <Td>{new Date(row.crawled_at).toLocaleString("fr-FR")}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <VisibilityPanel providers={snapshot.byProvider} />
          <AlertsPanel alerts={alertList} />
        </div>
      </div>
    </div>
  )
}
