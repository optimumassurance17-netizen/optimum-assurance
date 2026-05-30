import { getServerSession } from "next-auth"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"

export async function assertAdminApiAccess() {
  const session = await getServerSession(authOptions)
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "Accès administrateur requis" }, { status: 401 })
  }
  return null
}

export function getAdminSb() {
  return getSupabaseAdminClient()
}

export function getQueryParam(request: NextRequest, key: string): string | null {
  const value = new URL(request.url).searchParams.get(key)
  const normalized = value?.trim()
  return normalized ? normalized : null
}
