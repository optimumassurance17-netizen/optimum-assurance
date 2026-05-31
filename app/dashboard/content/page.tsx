import { generateContentAction, generateLocalPagesAction } from "@/app/dashboard/actions"
import { DashboardShell } from "@/optimum-geo-intelligence/components/dashboard-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/optimum-geo-intelligence/components/ui/card"
import { Table, Tbody, Td, Th, Thead, Tr } from "@/optimum-geo-intelligence/components/ui/table"
import { getSupabaseAdminClient } from "@/optimum-geo-intelligence/services/supabase-admin"

export const dynamic = "force-dynamic"

async function loadGeneratedContent() {
  try {
    const sb = getSupabaseAdminClient()
    const { data } = await sb
      .from("generated_content")
      .select("id,content_type,title,path,keyword,status,created_at")
      .order("created_at", { ascending: false })
      .limit(120)
    return data ?? []
  } catch {
    return []
  }
}

export default async function DashboardContentPage() {
  const rows = await loadGeneratedContent()

  return (
    <DashboardShell pathname="/dashboard/content">
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Génération IA unitaire</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={generateContentAction} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
                  <select
                    name="type"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                    defaultValue="guide"
                  >
                    <option value="article">Article SEO</option>
                    <option value="faq">FAQ</option>
                    <option value="guide">Guide</option>
                    <option value="metier">Page métier</option>
                    <option value="local-city">Page locale ville</option>
                    <option value="local-metier-city">Page locale métier+ville</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Mot-clé</label>
                  <input
                    name="keyword"
                    required
                    placeholder="assurance décennale artisan paris"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    name="city"
                    placeholder="Ville (optionnel)"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <input
                    name="profession"
                    placeholder="Métier (optionnel)"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <input
                  name="intent"
                  defaultValue="transactionnel"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="autoPublish" />
                  Publier directement
                </label>
                <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                  Générer contenu
                </button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Générateur GEO pages locales</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={generateLocalPagesAction} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Nb villes</label>
                    <input
                      type="number"
                      name="maxCities"
                      defaultValue={3}
                      min={1}
                      max={10}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Nb métiers</label>
                    <input
                      type="number"
                      name="maxProfessions"
                      defaultValue={4}
                      min={1}
                      max={9}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50">
                  Générer pages locales
                </button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Historique contenu généré ({rows.length})</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <Thead>
                <Tr>
                  <Th>Type</Th>
                  <Th>Titre</Th>
                  <Th>Path</Th>
                  <Th>Keyword</Th>
                  <Th>Status</Th>
                  <Th>Date</Th>
                </Tr>
              </Thead>
              <Tbody>
                {rows.map((row) => (
                  <Tr key={row.id}>
                    <Td>{row.content_type}</Td>
                    <Td className="max-w-[260px] truncate">{row.title}</Td>
                    <Td className="font-mono text-xs">{row.path}</Td>
                    <Td>{row.keyword}</Td>
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
