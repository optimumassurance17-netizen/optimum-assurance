"use client"

import { cn } from "@/optimum-geo-intelligence/lib/utils"

type ScoreTone = "excellent" | "good" | "average" | "poor"

function toneFromScore(score: number): ScoreTone {
  if (score >= 80) return "excellent"
  if (score >= 65) return "good"
  if (score >= 45) return "average"
  return "poor"
}

const TONE_CLASS: Record<ScoreTone, string> = {
  excellent: "bg-emerald-100 text-emerald-900",
  good: "bg-blue-100 text-blue-900",
  average: "bg-amber-100 text-amber-900",
  poor: "bg-red-100 text-red-900",
}

export function ScoreBadge({ score }: { score: number }) {
  const tone = toneFromScore(Number(score) || 0)
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", TONE_CLASS[tone])}>
      {score}/100
    </span>
  )
}
