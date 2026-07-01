import { NextRequest, NextResponse } from "next/server"

/**
 * Les routes de relance restent appelables par cron pour supervision, mais n'envoient
 * plus d'emails automatiquement. L'envoi réel exige un déclenchement manuel explicite :
 * `/api/cron/...?...&send=1` avec l'autorisation CRON_SECRET.
 */
export function requireManualReminderDispatch(request: NextRequest, routeName: string) {
  const send = request.nextUrl.searchParams.get("send")?.trim().toLowerCase()
  if (send === "1" || send === "true" || send === "yes") return null

  return NextResponse.json({
    ok: true,
    mode: "manual",
    route: routeName,
    sent: 0,
    skippedAutomaticDispatch: true,
    message:
      "Relances automatiques désactivées. Déclenchement manuel requis avec ?send=1.",
  })
}
