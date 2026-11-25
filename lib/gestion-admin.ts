import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin"
import { authOptions } from "@/lib/auth"

export async function requireGestionAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !isAdmin(session)) return null
  return session
}

export function gestionUnauthorized() {
  return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
}
