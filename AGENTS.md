# AGENTS.md

## Cursor Cloud specific instructions

### Architecture

Next.js 16 (App Router) + Prisma/PostgreSQL + NextAuth v4 + Mollie (paiements) + Resend (emails) + Supabase (signature électronique). Voir `.cursor/rules/optimum-assurance.mdc` pour le récapitulatif complet du projet.

### Services requis

| Service | Commande | Port |
|---------|----------|------|
| PostgreSQL | `docker compose up -d` | 5432 |
| Next.js dev | `npm run dev` | 3000 |

### Démarrage rapide

1. `dockerd &>/var/log/dockerd.log &` (si Docker daemon pas déjà démarré)
2. `docker compose up -d` (PostgreSQL)
3. `npm run dev` (serveur Next.js)

Le script `npm run dev:setup` copie `.env.example` → `.env`, génère `NEXTAUTH_SECRET`, et exécute `prisma db push`. Il est idempotent et ne doit être exécuté qu'une seule fois (ou après un reset de la DB).

### Commandes principales

- **Lint** : `npm run lint`
- **Typecheck** : `npm run typecheck`
- **Build** : `npm run build`
- **Boundaries check** : `npm run check:boundaries`
- **Tests E2E** : `npm run test:e2e` (nécessite `npm run e2e:seed-admin` d'abord + Playwright installé via `npx playwright install --with-deps chromium`)
- **Health check** : `curl http://localhost:3000/api/health`

### Gotchas

- Le `postinstall` de `package.json` exécute `prisma generate` automatiquement — pas besoin de le relancer manuellement après `npm install`.
- La DATABASE_URL par défaut dans `.env.example` pointe vers `postgresql://postgres:postgres@localhost:5432/optimum` — compatible avec le `docker-compose.yml` fourni.
- Le build produit un warning Turbopack (NFT tracing sur `next.config.ts` via Prisma runtime) qui est bénin et n'affecte pas le fonctionnement.
- Les clés API externes (Mollie, Resend, Supabase, OpenAI) sont optionnelles pour le développement local : l'app démarre et les pages statiques fonctionnent sans elles, mais les flows de paiement/email/signature nécessitent des clés valides.
- Réponses en **français** (préférence utilisateur dans `.cursor/rules`).
