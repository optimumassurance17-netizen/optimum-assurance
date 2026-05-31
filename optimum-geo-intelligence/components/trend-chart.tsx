import { Card, CardContent, CardHeader, CardTitle } from "@/optimum-geo-intelligence/components/ui/card"

type Point = { date: string; geoScore: number; seoScore: number }

function normalize(points: Point[], key: keyof Point) {
  const values = points.map((item) => Number(item[key] ?? 0))
  const max = Math.max(...values, 1)
  return values.map((v) => Math.round((v / max) * 100))
}

export function TrendChart({ points }: { points: Point[] }) {
  const geoHeights = normalize(points, "geoScore")
  const seoHeights = normalize(points, "seoScore")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tendance 7 jours (GEO vs SEO)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {points.map((point, index) => (
            <div key={`${point.date}-${index}`} className="flex flex-col items-center gap-2">
              <div className="flex h-32 w-full items-end justify-center gap-1 rounded-lg bg-slate-50 p-2">
                <div className="w-3 rounded-t bg-blue-600" style={{ height: `${geoHeights[index]}%` }} />
                <div className="w-3 rounded-t bg-violet-500" style={{ height: `${seoHeights[index]}%` }} />
              </div>
              <p className="text-[10px] font-medium text-slate-600">{point.date.slice(5)}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> GEO
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-violet-500" /> SEO
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
