import { recomputeGeoScoresAction, runSeoOptimizerAction } from "@/app/dashboard/actions"
import { DashboardShell } from "@/optimum-geo-intelligence/components/dashboard-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/optimum-geo-intelligence/components/ui/card"
import { Table, Tbody, Td, Th, Thead, Tr } from "@/optimum-geo-intelligence/components/ui/table"
import { getSupabaseAdminClient } from "@/optimum-geo-intelligence/services/supabase-admin"

export const dynamic = "force-dynamic"

async function loadSeoPages() {
  try {
    const sb = getSupabaseAdminClient()
    const { data } = await sb
      .from("seo_pages")
      .select("path,word_count,has_faq,has_schema,status,scanned_at")
      .order("scanned_at", { ascending: false })
      .limit(80)
    return data ?? []
  } catch {
    return []
  }
}

export default async function DashboardSeoPage() {
  const pages = await loadSeoPages()

  return (
    <DashboardShell pathname="/dashboard/seo">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>SEO Optimizer</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <form action={runSeoOptimizerAction}>
              <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                Scanner toutes les pages
              </button>
            </form>
            <form action={recomputeGeoScoresAction}>
              <button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50">
                Recalculer GEO_SCORE
              </button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pages détectées ({pages.length})</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <Thead>
                <Tr>
                  <Th>Path</Th>
                  <Th>Mots</Th>
                  <Th>FAQ</Th>
                  <Th>Schema</Th>
                  <Th>Status</Th>
                  <Th>Scan</Th>
                </Tr>
              </Thead>
              <Tbody>
                {pages.map((page) => (
                  <Tr key={page.path}>
                    <Td className="font-mono text-xs">{page.path}</Td>
                    <Td>{page.word_count}</Td>
                    <Td>{page.has_faq ? "Oui" : "Non"}</Td>
                    <Td>{page.has_schema ? "Oui" : "Non"}</Td>
                    <Td>{page.status}</Td>
                    <Td>{new Date(page.scanned_at).toLocaleString("fr-FR")}</Td>
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
