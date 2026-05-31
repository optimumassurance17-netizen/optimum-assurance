import { runCompetitorScanAction } from "@/app/dashboard/actions"
import { DashboardShell } from "@/optimum-geo-intelligence/components/dashboard-shell"
import { Badge } from "@/optimum-geo-intelligence/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/optimum-geo-intelligence/components/ui/card"
import { Table, Tbody, Td, Th, Thead, Tr } from "@/optimum-geo-intelligence/components/ui/table"
import { getSupabaseAdminClient } from "@/optimum-geo-intelligence/services/supabase-admin"

export const dynamic = "force-dynamic"

async function loadCompetitorRows() {
  try {
    const sb = getSupabaseAdminClient()
    const { data } = await sb
      .from("competitor_pages")
      .select("url,title,seo_score,is_new,changed_fields,crawled_at,competitors(name)")
      .order("crawled_at", { ascending: false })
      .limit(100)
    return data ?? []
  } catch {
    return []
  }
}

export default async function DashboardCompetitorsPage() {
  const rows = await loadCompetitorRows()

  return (
    <DashboardShell pathname="/dashboard/competitors">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Competitor Tracker</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={runCompetitorScanAction}>
              <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                Lancer crawl concurrentiel
              </button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Snapshots concurrents ({rows.length})</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <Thead>
                <Tr>
                  <Th>Concurrent</Th>
                  <Th>URL</Th>
                  <Th>Title</Th>
                  <Th>SEO Score</Th>
                  <Th>Delta</Th>
                  <Th>Date</Th>
                </Tr>
              </Thead>
              <Tbody>
                {rows.map((row, idx) => (
                  <Tr key={`${row.url}-${idx}`}>
                    <Td>{(row.competitors as { name?: string } | null)?.name ?? "—"}</Td>
                    <Td className="max-w-[300px] truncate">{row.url}</Td>
                    <Td className="max-w-[280px] truncate">{row.title}</Td>
                    <Td>{row.seo_score}</Td>
                    <Td>
                      {row.is_new ? <Badge tone="success">Nouveau</Badge> : <Badge tone="info">Update</Badge>}
                    </Td>
                    <Td>{new Date(row.crawled_at).toLocaleString("fr-FR")}</Td>
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
