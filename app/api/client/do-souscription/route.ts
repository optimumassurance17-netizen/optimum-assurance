import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { loadDoSouscriptionPayloadForUser } from "@/lib/do-souscription-resume"

/** Reprise de la souscription DO quand le navigateur n'a plus le brouillon sessionStorage. */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }
    const payload = await loadDoSouscriptionPayloadForUser(session.user.id, session.user.email)
    return NextResponse.json({ payload })
  } catch (error) {
    console.error("[do-souscription GET]", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
