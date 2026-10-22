import { NextRequest, NextResponse } from "next/server"

/**
 * Garde-fou des relances qui restent manuelles (signature, devis abandonné,
 * renouvellement, échec de paiement). L'envoi exige `?send=1`.
 * L'activation d'un contrat signé non payé ne passe pas par ce garde-fou :
 * `/api/cron/rappel-dossiers-incomplets` l'envoie sur l'appel planifié.
 */
export function isExplicitReminderSend(request: NextRequest): boolean {
  const send = request.nextUrl.searchParams.get("send")?.trim().toLowerCase()
  return send === "1" || send === "true" || send === "yes"
}

export function requireManualReminderDispatch(request: NextRequest, routeName: string) {
  if (isExplicitReminderSend(request)) return null

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
