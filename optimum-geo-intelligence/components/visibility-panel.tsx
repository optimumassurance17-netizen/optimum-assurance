import { Card, CardContent, CardHeader, CardTitle } from "@/optimum-geo-intelligence/components/ui/card"

type ProviderMap = Record<"chatgpt" | "gemini" | "claude" | "perplexity", number>

export function VisibilityPanel({ providers }: { providers: ProviderMap }) {
  const max = Math.max(...Object.values(providers), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Visibilité IA par provider</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(providers).map(([provider, score]) => {
          const width = Math.max(6, Math.round((score / max) * 100))
          return (
            <div key={provider} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <p className="font-medium text-slate-800">{provider}</p>
                <p className="font-semibold text-slate-900">{score}</p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${width}%` }} />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
