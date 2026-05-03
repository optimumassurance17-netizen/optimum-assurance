import { NextRequest, NextResponse } from "next/server"
import { getActiveActivities, resolveUserActivities } from "@/lib/activity-nomenclature"

function parseInputsFromRequest(req: NextRequest): string[] {
  const url = new URL(req.url)
  const q = (url.searchParams.get("q") || "").trim()
  if (!q) return []
  return q
    .split(/[,\n;]/)
    .map((value) => value.trim())
    .filter(Boolean)
}

export async function GET(request: NextRequest) {
  try {
    const rawInputs = parseInputsFromRequest(request)
    if (rawInputs.length === 0) {
      const activities = await getActiveActivities()
      return NextResponse.json({ activities })
    }
    const resolution = await resolveUserActivities(rawInputs)
    return NextResponse.json(resolution)
  } catch (error) {
    console.error("[activities/search] GET", error)
    return NextResponse.json({ error: "Erreur recherche activités" }, { status: 500 })
  }
}
