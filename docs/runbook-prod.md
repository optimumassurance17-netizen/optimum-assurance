# Runbook Production - Optimum Assurance

Ce document sert de procedure standard pour deployer, verifier et surveiller la production.

## 1) Pre-deploiement (obligatoire)

- Verifier que la branche de reference est `main`.
- Verifier que la CI est verte sur le commit vise (lint, build, tests).
- Verifier que le build local passe:
  - `npm run vercel-build`
- Verifier que les changements sensibles sont couverts:
  - auth / connexion
  - devis
  - paiement / signature
  - routes cron

## 2) Deploiement standard

1. Push sur `main`.
2. Attendre le run GitHub Actions.
3. Verifier le statut Vercel du meme SHA.
4. En cas d'echec Vercel:
   - confirmer le SHA deploye
   - comparer avec `origin/main`
   - relancer un redeploy sans cache

## 3) Verification post-release (5 minutes)

- `GET /api/health` -> 200 + `status: ok`
- `GET /` -> 200
- `GET /connexion` -> 200
- `GET /devis` -> 200
- `GET /devis/rcpro` -> 200
- `GET /devis/rcpro/result?id=test&price=123.45` -> 200
- `GET /signature/callback` -> 200
- `GET /espace-client/rcpro` -> 200

### Verifications API sensibles

- `POST /api/rcpro/calculate` avec payload valide -> 200
- `POST /api/rcpro/create-quote` sans session -> 401 attendu
- `GET /api/rcpro/get-user-quotes` sans session -> 401 attendu
- `GET /api/cron/*` sans token -> 401 attendu

## 4) Surveillance quotidienne (exploitation)

- Verifier les derniers runs CI de `main`.
- Verifier les logs Vercel sur:
  - `/connexion`
  - `/devis`
  - `/devis/rcpro`
  - `/api/rcpro/*`
  - `/signature/callback`
- Verifier l'execution des crons:
  - `/api/cron/rappels-renouvellement`
  - `/api/cron/rappel-devis-abandonne`
  - `/api/cron/rappel-signatures-en-attente`
  - `/api/cron/rappel-paiements-contrats`
  - `/api/cron/sepa-trimestriel`

## 5) Gestion incident build Next.js (cas connu)

### Symptom

- Build echoue avec:
  - `'searchParams' is possibly 'null'`
  - `'params' is possibly 'null'`
  - `useSearchParams() should be wrapped in a suspense boundary`

### Correctif type

- Toujours proteger les usages:
  - `const safeSearchParams = searchParams ?? new URLSearchParams()`
  - `const routeId = typeof params?.id === "string" ? params.id : ""`
- Encapsuler les pages qui utilisent `useSearchParams` dans `Suspense`.

### Validation

- `npm run vercel-build`
- push sur `main`
- verifier CI + statut Vercel du SHA

## 6) Methode performance reproductible (Lighthouse)

Objectif: mesurer de facon stable, prioriser les pages critiques, et valider chaque optimisation par des chiffres.

### Scope minimum a mesurer

- Home: `/`
- Devis: `/devis`
- RC Pro: `/devis/rcpro`
- Pages SEO metier:
  - `/assurance-decennale/plomberie-sanitaire`
  - `/assurance-decennale/electricite-generale`
  - `/assurance-decennale/maconnerie-generale`
- Pages SEO dommage-ouvrage:
  - `/dommage-ouvrage/auto-construction`
  - `/dommage-ouvrage/clos-et-couvert`

### Regle de mesure

- Toujours faire **3 runs** par page.
- Travailler en mobile en priorite, puis desktop.
- Utiliser le meme binaire Chromium pour eviter les variations d'environnement:
  - `CHROME_PATH="/home/ubuntu/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome"`

### Commande type (mobile)

```bash
CHROME_PATH="/home/ubuntu/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome"
for i in 1 2 3; do
  npx lighthouse "https://www.optimum-assurance.fr/devis" \
    --quiet \
    --chrome-path="$CHROME_PATH" \
    --chrome-flags="--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage" \
    --output=json \
    --output-path="/tmp/lh-devis-$i.json" \
    --only-categories=performance \
    --preset=perf
done
```

### Seuils cibles (mobile)

- Score performance >= 95
- LCP <= 2.5s (ideal proche de 1s sur pages legeres)
- TBT < 150ms
- CLS < 0.1

### Procedure d'optimisation

1. Identifier la page la plus faible (score / LCP).
2. Identifier le vrai LCP (texte principal, cookie banner, hero, image).
3. Appliquer un changement **cible** (pas de refacto global):
   - code splitting des blocs non critiques
   - suppression d'un suspense bloquant au-dessus de la ligne de flottaison
   - reduction JS initial
   - report des widgets secondaires (chat, FAQ, etc.)
4. Refaire 3 runs et comparer la moyenne.
5. Conserver le changement seulement si la moyenne s'ameliore.

### Validation finale

- `npm run vercel-build`
- push `main`
- attendre CI + Vercel success
- re-mesurer en production et archiver le resultat dans le suivi ops

## 7) Commandes utiles

- Build prod local:
  - `npm run vercel-build`
- Health/check prod:
  - `npm run verify:prod`
- Afficher planning crons:
  - `npm run print:crons`
- Verifier variables Vercel:
  - `npm run verify:vercel-env`

## 8) Responsabilites

- Dev: qualite code + build + checks post-release.
- Ops: monitoring quotidien + verification crons + suivi erreurs prod.
- Owner: validation metier finale (devis, contrats, paiements, emails).
