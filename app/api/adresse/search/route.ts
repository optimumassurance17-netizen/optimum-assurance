import { NextRequest, NextResponse } from "next/server"
import { searchAdresseBan } from "@/lib/adresse-api"

/**
 * Proxy recherche adresse (Base Adresse nationale) — pas de clé API requise.
 * GET ?q=...
 */
export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q")?.trim() || ""
    if (q.length < 3) {
      return NextResponse.json({ suggestions: [] })
    }
    if (q.length > 200) {
      return NextResponse.json({ error: "Requête trop longue" }, { status: 400 })
    }

    const suggestions = await searchAdresseBan(q)
    return NextResponse.json({ suggestions })
  } catch (e) {
    console.error("[api/adresse/search]", e)
    return NextResponse.json({ error: "Erreur recherche adresse" }, { status: 500 })
  }
}
