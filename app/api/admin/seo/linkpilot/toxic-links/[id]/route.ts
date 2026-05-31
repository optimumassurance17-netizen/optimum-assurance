import { NextRequest, NextResponse } from "next/server"
import { assertAdminApiAccess, getAdminSb } from "@/app/api/admin/seo/linkpilot/_shared"

function extractId(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean)
  return parts[parts.length - 1] ?? null
}

export async function DELETE(request: NextRequest) {
  const denied = await assertAdminApiAccess()
  if (denied) return denied
  const sb = getAdminSb()
  const id = extractId(new URL(request.url).pathname)
  if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 })

  const { error } = await sb.from("toxic_domains").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
