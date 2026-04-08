# Checklist avant mise en production (résumé)

À faire **côté équipe / ops** ; le code peut être prêt sans que ces points soient cochés.

| # | Tâche | Détail |
|---|--------|--------|
| 1 | Variables | `npm run check-env` → tout vert (obligatoires). |
| 2 | URLs | `NEXT_PUBLIC_APP_URL`, `NEXTAUTH_URL` en **HTTPS** sur le domaine final. |
| 3 | Secrets | `CRON_SECRET` défini en prod (les crons Vercel renvoient **503** si absent en production — voir `lib/cron-auth.ts`). |
| 4 | Webhooks | Mollie → `/api/mollie/webhook`. |
| 5 | Signature | Supabase : `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` + SQL `sign_*` (voir `sql/supabase-esign-complete.sql`). |
| 6 | SEPA trimestriel (reconduction auto) | Table `SepaSubscription` : `npx prisma db push` après déploiement ; cron `/api/cron/sepa-trimestriel` (Vercel 07:00 UTC) + doc [SEPA-RECURRENT-MOLLIE.md](./SEPA-RECURRENT-MOLLIE.md). |
| 7 | Légal | Relire CGV / contrats ; renseigner `NEXT_PUBLIC_ORIAS_*`, `NEXT_PUBLIC_LEGAL_*` dans `.env`. |

Guides détaillés : `GUIDE-MISE-EN-LIGNE-SIMPLE.md`, `DEPLOYMENT.md`.
