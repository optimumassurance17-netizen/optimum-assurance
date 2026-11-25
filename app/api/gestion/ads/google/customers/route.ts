import { NextResponse } from "next/server"
import { listGoogleAdsCustomers, selectGoogleAdsCustomer } from "@/lib/google-ads"
import { gestionUnauthorized, requireGestionAdmin } from "@/lib/gestion-admin"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await requireGestionAdmin()
  if (!session) return gestionUnauthorized()
  try {
    const customers = await listGoogleAdsCustomers()
    return NextResponse.json({ customers })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lecture des comptes impossible."
    return NextResponse.json({ error: message.slice(0, 180) }, { status: 502 })
  }
}

export async function POST(request: Request) {
  const session = await requireGestionAdmin()
  if (!session) return gestionUnauthorized()
  const body = (await request.json().catch(() => ({}))) as { customerId?: string }
  try {
    const customerId = await selectGoogleAdsCustomer(body.customerId || "")
    return NextResponse.json({ customerId })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Compte refusé."
    return NextResponse.json({ error: message.slice(0, 180) }, { status: 400 })
  }
}
