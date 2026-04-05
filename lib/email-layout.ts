import { SITE_URL } from "@/lib/site-url"
import { LEGAL_FOOTER_LINES } from "@/lib/legal-branding"

const TEXT_FOOTER_MARKER = "ORIAS LPS 28931947"

/** Échappement HTML pour corps d’e-mails (champs utilisateur). */
export function escapeHtmlForEmail(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * Enveloppe HTML des e-mails transactionnels : fond neutre, carte blanche, logo et mentions en bas.
 */
export function wrapTransactionalEmailHtml(contentHtml: string): string {
  const logoUrl = `${SITE_URL}/icon-192.png`
  const host = SITE_URL.replace(/^https?:\/\//, "")
  const legalBlocks = LEGAL_FOOTER_LINES.map(
    (line) =>
      `<p style="margin:6px 0 0;font-size:11px;line-height:1.5;color:#64748b;text-align:center;">${escapeHtmlForEmail(line)}</p>`
  ).join("")

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="x-ua-compatible" content="ie=edge">
<title>Optimum Assurance</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f5f9;padding:28px 16px 40px;">
  <tr>
    <td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr>
          <td style="padding:28px 26px 20px;color:#0f172a;font-size:15px;line-height:1.55;font-family:system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
            ${contentHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 24px 26px;border-top:1px solid #e2e8f0;background:#fafafa;">
            <div style="text-align:center;">
              <img src="${logoUrl}" alt="Optimum Assurance" width="96" height="96" style="display:inline-block;width:96px;height:96px;max-width:96px;border:0;vertical-align:middle;" />
            </div>
            <div style="margin-top:14px;max-width:480px;margin-left:auto;margin-right:auto;">
              ${legalBlocks}
            </div>
            <p style="margin:16px 0 0;font-size:12px;line-height:1.45;color:#94a3b8;text-align:center;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
              <a href="${SITE_URL}" style="color:#2563eb;text-decoration:none;">${escapeHtmlForEmail(host)}</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

/**
 * Pied de page texte brut (clients sans HTML).
 */
export function appendTransactionalEmailTextFooter(text: string): string {
  if (text.includes(TEXT_FOOTER_MARKER)) return text
  const lines = LEGAL_FOOTER_LINES.join("\n")
  return `${text.trimEnd()}\n\n—\n${lines}\n${SITE_URL}`
}
