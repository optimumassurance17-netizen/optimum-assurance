# Checklist avant mise en production (résumé)

À faire **côté équipe / ops** ; le code peut être prêt sans que ces points soient cochés.

| # | Tâche | Détail |
|---|--------|--------|
| 1 | Variables | `npm run check-env` → tout vert (obligatoires). |
| 2 | URLs | `NEXT_PUBLIC_APP_URL`, `NEXTAUTH_URL` en **HTTPS** sur le domaine final. |
| 3 | Secrets | `CRON_SECRET` défini en prod (les crons Vercel renvoient **503** si absent en production — voir `lib/cron-auth.ts`). |
| 4 | Webhooks | Mollie + Yousign pointent vers l’URL publique `/api/mollie/webhook`, `/api/yousign/webhook`. |
| 5 | Yousign | `YOUSIGN_WEBHOOK_SECRET` renseigné pour valider `X-Yousign-Signature-256`. |
| 6 | SEPA T2–T4 | Table `SepaSubscription` : `npx prisma db push` après déploiement ; cron `/api/cron/sepa-trimestriel` (Vercel 07:00 UTC) + doc [SEPA-RECURRENT-MOLLIE.md](./SEPA-RECURRENT-MOLLIE.md). |
| 7 | Légal | Relire CGV / contrats ; renseigner `NEXT_PUBLIC_ORIAS_*`, `NEXT_PUBLIC_LEGAL_*` dans `.env`. |

Guides détaillés : `GUIDE-MISE-EN-LIGNE-SIMPLE.md`, `DEPLOYMENT.md`.
