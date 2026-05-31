import { runGeoAnalysisAction } from "@/app/dashboard/actions"
import { DashboardShell } from "@/optimum-geo-intelligence/components/dashboard-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/optimum-geo-intelligence/components/ui/card"
import { Table, Tbody, Td, Th, Thead, Tr } from "@/optimum-geo-intelligence/components/ui/table"
import { getSupabaseAdminClient } from "@/optimum-geo-intelligence/services/supabase-admin"

export const dynamic = "force-dynamic"

async function loadGeoResults() {
  try {
    const sb = getSupabaseAdminClient()
    const { data } = await sb
      .from("geo_results")
      .select("provider,brand_mentions,competitor_mentions,visibility_ratio,geo_score,captured_at,geo_queries(query)")
      .order("captured_at", { ascending: false })
      .limit(80)
    return data ?? []
  } catch {
    return []
  }
}

export default async function DashboardGeoPage() {
  const rows = await loadGeoResults()

  return (
    <DashboardShell pathname="/dashboard/geo">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>GEO Visibility Engine</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={runGeoAnalysisAction}>
              <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                Lancer une analyse GEO complète
              </button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historique GEO ({rows.length})</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <Thead>
                <Tr>
                  <Th>Query</Th>
                  <Th>Provider</Th>
                  <Th>Mentions marque</Th>
                  <Th>Mentions concurrents</Th>
                  <Th>Ratio visibilité</Th>
                  <Th>GEO score</Th>
                  <Th>Date</Th>
                </Tr>
              </Thead>
              <Tbody>
                {rows.map((row, idx) => (
                  <Tr key={`${row.provider}-${row.captured_at}-${idx}`}>
                    <Td>{(row.geo_queries as { query?: string } | null)?.query ?? "—"}</Td>
                    <Td>{row.provider}</Td>
                    <Td>{row.brand_mentions}</Td>
                    <Td>{row.competitor_mentions}</Td>
                    <Td>{Number(row.visibility_ratio).toFixed(3)}</Td>
                    <Td>{row.geo_score}</Td>
                    <Td>{new Date(row.captured_at).toLocaleString("fr-FR")}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
