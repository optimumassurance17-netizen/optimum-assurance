import { ArrowDown, ArrowUp, Minus } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/optimum-geo-intelligence/components/ui/card"
import { cn } from "@/optimum-geo-intelligence/lib/utils"

export function ScoreCard(props: {
  title: string
  description: string
  value: number | string
  trend?: number
}) {
  const trend = props.trend ?? 0
  const TrendIcon = trend > 0 ? ArrowUp : trend < 0 ? ArrowDown : Minus
  return (
    <Card>
      <CardHeader className="pb-2">
        <div>
          <CardTitle className="text-base">{props.title}</CardTitle>
          <CardDescription>{props.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex items-end justify-between">
        <p className="text-3xl font-bold text-slate-900">{props.value}</p>
        <p
          className={cn(
            "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold",
            trend > 0
              ? "bg-emerald-100 text-emerald-800"
              : trend < 0
                ? "bg-red-100 text-red-800"
                : "bg-slate-100 text-slate-700"
          )}
        >
          <TrendIcon className="h-3.5 w-3.5" />
          {trend > 0 ? `+${trend}` : trend}
        </p>
      </CardContent>
    </Card>
  )
}
