import { NextRequest, NextResponse } from "next/server"
import { assertCronSecret } from "@/optimum-geo-intelligence/server/security"
import { runScheduledStep } from "@/optimum-geo-intelligence/services/orchestrator"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const unauthorized = assertCronSecret(request)
  if (unauthorized) return unauthorized
  const result = await runScheduledStep("alerts")
  return NextResponse.json({ ok: true, step: "alerts", result })
}
