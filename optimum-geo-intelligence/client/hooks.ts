"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error ?? `Erreur ${response.status}`)
  }
  return (await response.json()) as T
}

export function useOgiDashboard() {
  return useQuery({
    queryKey: ["ogi-dashboard"],
    queryFn: () =>
      fetchJson<{
        snapshot: {
          geoScoreGlobal: number
          seoScoreGlobal: number
          contentFreshness: number
          activeAlerts: number
          generatedPagesCount: number
          competitorDeltaCount: number
          byProvider: Record<"chatgpt" | "gemini" | "claude" | "perplexity", number>
          trend7d: Array<{ date: string; geoScore: number; seoScore: number }>
        }
        alerts: Array<{
          id: string
          category: string
          title: string
          message: string
          severity: "low" | "medium" | "high" | "critical"
          status: string
          created_at: string
        }>
        competitors: Array<{
          id: string
          url: string
          title: string
          seo_score: number
          is_new: boolean
          changed_fields: string[]
          crawled_at: string
          competitors: { name: string } | null
        }>
      }>("/api/geo-intelligence/dashboard"),
  })
}

export function useOgiAction(endpoint: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body?: unknown) =>
      fetchJson(`/api/geo-intelligence/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["ogi-dashboard"] })
    },
  })
}
