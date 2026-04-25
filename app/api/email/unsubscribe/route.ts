import { NextRequest, NextResponse } from "next/server"
import {
  markReminderUnsubscribed,
  parseReminderUnsubscribeToken,
  type ReminderUnsubscribeKind,
} from "@/lib/reminder-unsubscribe"

const LABELS: Record<ReminderUnsubscribeKind, string> = {
  devis_reminder: "relances devis",
  signature_reminder: "relances signature",
  payment_reminder: "relances paiement",
  dossier_incomplete_reminder: "relances dossier incomplet",
  renewal_reminder: "relances renouvellement",
  all_reminders: "toutes les relances",
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = (searchParams.get("token") || "").trim()
    if (!token) {
      return NextResponse.json({ error: "Lien invalide" }, { status: 400 })
    }
    const payload = parseReminderUnsubscribeToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Lien invalide ou expiré" }, { status: 400 })
    }

    const status = await markReminderUnsubscribed(payload.email, payload.kind)
    const label = LABELS[payload.kind]
    const body =
      status === "already"
        ? `<h1 style="font:600 20px system-ui;margin:0 0 8px;">Déjà désabonné</h1><p style="font:400 15px system-ui;margin:0;">L’adresse <strong>${payload.email}</strong> est déjà désabonnée des <strong>${label}</strong>.</p>`
        : `<h1 style="font:600 20px system-ui;margin:0 0 8px;">Désabonnement confirmé</h1><p style="font:400 15px system-ui;margin:0;">L’adresse <strong>${payload.email}</strong> ne recevra plus les <strong>${label}</strong>.</p>`

    return new NextResponse(
      `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Désabonnement</title></head><body style="margin:0;background:#f8fafc;color:#0f172a;"><main style="max-width:620px;margin:48px auto;padding:24px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;">${body}<p style="font:400 13px system-ui;color:#64748b;margin:16px 0 0;">Si c’était une erreur, contactez-nous via le formulaire de contact.</p></main></body></html>`,
      {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      }
    )
  } catch (error) {
    console.error("[api/email/unsubscribe] GET", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
