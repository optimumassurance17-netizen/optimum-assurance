import { Badge } from "@/optimum-geo-intelligence/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/optimum-geo-intelligence/components/ui/card"

type AlertItem = {
  id: string
  category: string
  title: string
  message: string
  severity: "low" | "medium" | "high" | "critical"
  status: string
  created_at: string
}

function severityTone(severity: AlertItem["severity"]) {
  if (severity === "critical") return "danger"
  if (severity === "high") return "warning"
  if (severity === "medium") return "info"
  return "default"
}

export function AlertsPanel({ alerts }: { alerts: AlertItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Alertes stratégiques</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? <p className="text-sm text-slate-500">Aucune alerte active.</p> : null}
        {alerts.map((alert) => (
          <div key={alert.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-semibold text-slate-900">{alert.title}</p>
              <Badge tone={severityTone(alert.severity)}>{alert.severity}</Badge>
            </div>
            <p className="text-sm text-slate-700">{alert.message}</p>
            <p className="mt-1 text-xs text-slate-500">
              {alert.category} · {new Date(alert.created_at).toLocaleString("fr-FR")}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
