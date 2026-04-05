# Checklist déploiement — Optimum Assurance

Détails longs : **`DEPLOY.md`**.  
Ci-dessous : **ce qui reste à faire** + rappel de ce qui est **déjà traité** (à ne pas remettre sur ta liste demain).

---

## Déjà fait — tu peux barrer ça de ta tête

- Commit Git local avec migrations Prisma baseline, scripts (`verify-supabase`, `audit:env`, sync `DATABASE_URL`, signature MVP, checklist, etc.) — **reste seulement à pousser** (voir ci-dessous).
- **Prisma** : migration `20260403120000_baseline` + `migrate resolve` / `migrate deploy` sur la base utilisée.
- **`.env`** : `DATABASE_URL` alignée prod via **`npm run db:sync-url-vercel`** ; commentaire SQLite corrigé ; placeholder **`NEXTAUTH_SECRET`** retiré du `.env` (secret dans **`.env.local`**).
- **`.gitignore`** : `playwright-report/`, `test-results/` ; rapports retirés du dépôt.
- **Qualité** : `npm run lint`, `preflight`, `build` OK en local ; `npm audit fix` sans `--force` déjà appliqué (alertes `vercel` CLI restantes = connues).

---

## À faire quand tu reviens

### Prioritaire
- [ ] **`git push`** vers GitHub (déclenche Vercel + CI).
- [ ] Vérifier sur **Vercel** que le déploiement **Production** est vert après le push.
- [ ] **`https://www.optimum-assurance.fr/api/health`** (ou ton domaine) → base OK.

### Prod / intégrations (si pas déjà 100 %)
- [ ] **Mollie** : webhook `https://TON_DOMAINE/api/mollie/webhook` ; clé **`live_`** en prod sur Vercel.
- [ ] **Yousign** : `YOUSIGN_ENV=production` ; webhooks / callback ; idéalement **`YOUSIGN_WEBHOOK_SECRET`** sur Vercel.
- [ ] **`CRON_SECRET`** sur Vercel si tu veux que les **`/api/cron/*`** tournent.
- [ ] **Resend** : domaine vérifié, **`EMAIL_FROM`** cohérent.

### Signature MVP Supabase (uniquement si tu l’utilises)
- [ ] SQL Supabase : `sql/supabase-esign-mvp.sql` + `sql/supabase-esign-storage.sql`.
- [ ] Vercel : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, **`SUPABASE_SERVICE_ROLE_KEY`**.
- [ ] **`npm run verify:supabase`** puis test `npm run esign:create-request -- …`.

### Optionnel
- [ ] **Search Console** + sitemap.
- [ ] Variables optionnelles (`NEXT_PUBLIC_PHONE`, Upstash, Pappers, etc.) selon tes besoins.
- [ ] Si tu as partagé des secrets en clair quelque part : **rotation** mot de passe Neon / clés concernées.

---

## Commandes utiles

```bash
npm run audit:env && npm run check-env && npm run preflight
npx vercel env pull .env.vercel.pull --environment production --yes && npm run db:sync-url-vercel
npx prisma migrate deploy
git push
```

---

*Mis à jour : liste allégée — les étapes déjà réalisées en session ont été retirées de « à faire demain ».*
