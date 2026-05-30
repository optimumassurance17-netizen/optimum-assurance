import { serve } from "https://deno.land/std@0.224.0/http/server.ts"

const STEP_TO_PATH: Record<string, string> = {
  competitor: "/api/cron/geo-competitors",
  geo: "/api/cron/geo-visibility",
  content: "/api/cron/geo-content-generation",
  optimizer: "/api/cron/geo-seo-optimizer",
  alerts: "/api/cron/geo-alerts",
  snapshot: "/api/cron/geo-daily-snapshot",
}

serve(async (req) => {
  try {
    const url = new URL(req.url)
    const step = url.searchParams.get("step") ?? "snapshot"
    const path = STEP_TO_PATH[step]
    if (!path) {
      return new Response(JSON.stringify({ error: "Unknown step" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const baseUrl = Deno.env.get("OGI_TARGET_BASE_URL")
    const cronSecret = Deno.env.get("CRON_SECRET")
    if (!baseUrl || !cronSecret) {
      return new Response(
        JSON.stringify({ error: "Missing OGI_TARGET_BASE_URL or CRON_SECRET environment variable" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    const response = await fetch(`${baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    })
    const text = await response.text()
    return new Response(text, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
