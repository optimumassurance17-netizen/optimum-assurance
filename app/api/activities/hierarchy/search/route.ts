import { NextRequest, NextResponse } from "next/server"
import { searchActivityHierarchy } from "@/lib/activity-hierarchy"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const term = (searchParams.get("q") || "").trim()
    const limitRaw = Number(searchParams.get("limit") || "10")
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 10

    if (term.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const results = await searchActivityHierarchy(term, { limit })
    return NextResponse.json({ results })
  } catch (error) {
    console.error("[api/activities/hierarchy/search]", error)
    return NextResponse.json(
      { error: "Impossible de rechercher les activites pour le moment." },
      { status: 500 }
    )
  }
}
