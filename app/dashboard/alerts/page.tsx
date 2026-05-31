import { runAlertsAction } from "@/app/dashboard/actions"
import { DashboardShell } from "@/optimum-geo-intelligence/components/dashboard-shell"
import { Badge } from "@/optimum-geo-intelligence/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/optimum-geo-intelligence/components/ui/card"
import { Table, Tbody, Td, Th, Thead, Tr } from "@/optimum-geo-intelligence/components/ui/table"
import { getSupabaseAdminClient } from "@/optimum-geo-intelligence/services/supabase-admin"

export const dynamic = "force-dynamic"

async function loadAlerts() {
  try {
    const sb = getSupabaseAdminClient()
    const { data } = await sb
      .from("alerts")
      .select("id,category,title,message,severity,status,created_at")
      .order("created_at", { ascending: false })
      .limit(150)
    return data ?? []
  } catch {
    return []
  }
}

function tone(severity: string) {
  if (severity === "critical") return "danger"
  if (severity === "high") return "warning"
  if (severity === "medium") return "info"
  return "default"
}

export default async function DashboardAlertsPage() {
  const rows = await loadAlerts()

  return (
    <DashboardShell pathname="/dashboard/alerts">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Alert Center</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={runAlertsAction}>
              <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                Exécuter les alertes maintenant
              </button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historique alertes ({rows.length})</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <Thead>
                <Tr>
                  <Th>Catégorie</Th>
                  <Th>Titre</Th>
                  <Th>Message</Th>
                  <Th>Sévérité</Th>
                  <Th>Status</Th>
                  <Th>Date</Th>
                </Tr>
              </Thead>
              <Tbody>
                {rows.map((row) => (
                  <Tr key={row.id}>
                    <Td>{row.category}</Td>
                    <Td>{row.title}</Td>
                    <Td className="max-w-[380px] truncate">{row.message}</Td>
                    <Td>
                      <Badge tone={tone(row.severity)}>{row.severity}</Badge>
                    </Td>
                    <Td>{row.status}</Td>
                    <Td>{new Date(row.created_at).toLocaleString("fr-FR")}</Td>
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
