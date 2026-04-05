# Checklist déploiement — Optimum Assurance

Détails longs : **`DEPLOY.md`**.  
Ci-dessous : **état actuel** + ce qui reste **manuel** (dashboards externes).

---

## Déjà fait — conforme

- **Git** : `main` poussé sur GitHub ; CI + déploiement Vercel déclenchés.
- **Vercel** : dernier déploiement **Production** **Ready** ; alias `https://www.optimum-assurance.fr`.
- **Santé prod** : `https://www.optimum-assurance.fr/api/health` → base **connected**, email Resend **configured**.
- **Variables Vercel (Production)** : vérifiées par **`npm run verify:vercel-env`** — toutes les clés **requises** sont présentes (`DATABASE_URL`, auth, Mollie, Yousign, Resend, **`CRON_SECRET`**, **`YOUSIGN_WEBHOOK_SECRET`**, etc.).
- **Prisma** : migration baseline appliquée côté base utilisée ; scripts `db:sync-url-vercel`, `verify-supabase`, etc. documentés dans `DEPLOY.md`.
- **Qualité locale** : `npm run lint`, `preflight`, `build` OK.

---

## À faire côté dashboards (non automatisables ici)

### Mollie
- [ ] Dans **Developers → Webhooks** (ou app Mollie), URL : **`https://www.optimum-assurance.fr/api/mollie/webhook`**.
- [ ] Confirmer que la clé API en prod est bien **`live_`** (déjà sur Vercel ; ne pas la committer).

### Yousign
- [ ] Webhook / callback alignés avec **`YOUSIGN_ENV=production`** et l’URL du site (voir `npm run print:webhooks`).
- La **clé secrète** webhook est déjà sur Vercel (`YOUSIGN_WEBHOOK_SECRET`) ; en cas de rotation, mettre à jour **Vercel** et le **dashboard Yousign**.

### Resend
- [ ] Domaine d’envoi **vérifié** ; `EMAIL_FROM` cohérent avec ce domaine (déjà sur Vercel).

### Signature MVP Supabase (uniquement si tu utilises `/api/sign` + Storage)
- [ ] SQL : `sql/supabase-esign-mvp.sql` + `sql/supabase-esign-storage.sql`.
- [ ] Vercel : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, **`SUPABASE_SERVICE_ROLE_KEY`**.
- [ ] **`npm run verify:supabase`** puis test `npm run esign:create-request -- …`.

### Optionnel
- [ ] **Google Search Console** + propriété domaine ; sitemap déjà servi (`/sitemap.xml`).
- [ ] Variables optionnelles : `NEXT_PUBLIC_SITE_CANONICAL`, téléphone/WhatsApp, **Upstash**, Pappers, etc. selon besoins.
- [ ] Rotation des secrets si exposition accidentelle.

---

## Commandes utiles

```bash
npm run audit:env && npm run check-env && npm run preflight
npm run verify:prod
npm run verify:vercel-env
npm run print:webhooks
npx vercel env pull .env.vercel.pull --environment production --yes && npm run db:sync-url-vercel
npx prisma migrate deploy
```

---

*Mis à jour : état post-vérification Vercel + prod.*
