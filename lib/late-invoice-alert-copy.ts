import { escapeHtmlForEmail } from "@/lib/email-layout"
import { formatEcheanceDay } from "@/lib/echeance-reminder"

const SHOWN_ROWS = 20

export type LateInvoiceRow = {
  userId: string
  clientLabel: string
  label: string
  amount: number
  dueDate: string
}

export function lateInvoiceAlertMessage(
  rows: LateInvoiceRow[],
  siteUrl: string
): { subject: string; text: string; html: string } {
  const count = rows.length
  const subject = count === 1 ? "[Optimum] 1 facture en retard" : `[Optimum] ${count} factures en retard`
  const intro = count === 1 ? "Une facture est en retard." : `${count} factures sont en retard.`
  const shown = rows.slice(0, SHOWN_ROWS)
  const hidden = count - shown.length
  const base = siteUrl.replace(/\/$/, "")
  const lines = shown.map((row) => {
    const due = formatEcheanceDay(new Date(row.dueDate))
    const amount = row.amount.toLocaleString("fr-FR")
    const fiche = `${base}/gestion/clients/${row.userId}`
    return `${row.clientLabel} — ${row.label} — ${amount} € — échéance le ${due} — ${fiche}`
  })
  if (hidden > 0) {
    lines.push(`${hidden} autre${hidden > 1 ? "s" : ""} facture${hidden > 1 ? "s" : ""} dans la gestion.`)
  }
  const text = [intro, "", ...lines, "", `Gestion : ${base}/gestion`].join("\n")
  const htmlItems = shown
    .map((row) => {
      const due = formatEcheanceDay(new Date(row.dueDate))
      const amount = row.amount.toLocaleString("fr-FR")
      const fiche = `${base}/gestion/clients/${row.userId}`
      return `<li style="margin:0 0 8px;"><a href="${escapeHtmlForEmail(fiche)}" style="color:#2563eb;">${escapeHtmlForEmail(row.clientLabel)}</a> — ${escapeHtmlForEmail(row.label)} — ${escapeHtmlForEmail(amount)} € — échéance le ${escapeHtmlForEmail(due)}</li>`
    })
    .join("")
  const more =
    hidden > 0
      ? `<p style="margin:12px 0 0;">${hidden} autre${hidden > 1 ? "s" : ""} dans la gestion.</p>`
      : ""
  const html = `<p style="font-weight:600;font-size:16px;margin:0 0 12px;">${escapeHtmlForEmail(intro)}</p><ul style="margin:0;padding-left:18px;">${htmlItems}</ul>${more}<p style="margin:16px 0 0;"><a href="${escapeHtmlForEmail(base)}/gestion" style="color:#2563eb;">Ouvrir la gestion</a></p>`
  return { subject, text, html }
}
