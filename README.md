# Optimum Assurance — Assurance décennale & dommage ouvrage

Site de souscription d'assurance décennale BTP et dommage ouvrage avec tarification automatique, signature électronique Yousign et paiement Mollie.

## Fonctionnalités

- **Assurance décennale** : Devis en 3 min, signature Yousign, paiement SEPA, attestation immédiate
- **Dommage ouvrage** : Demande en ligne, devis sous 24h, paiement Mollie
- **Tarification automatique** : CA, sinistres, activités, historique
- **Signature électronique** : Yousign (eIDAS)
- **Paiement** : Mollie (SEPA, Pay by Bank)
- **Espace client** : Documents, attestations, régularisation
- **Gestion CRM** : Admin, devis DO, avenants

## Installation

```bash
npm install
npx prisma db push
```

## Configuration

1. Copier `.env.example` vers `.env`
2. Renseigner les variables (voir [DEPLOYMENT.md](./DEPLOYMENT.md) pour la liste complète)
3. Générer un secret : `npm run generate-secret` → copier dans `.env`
4. Vérifier la config : `npm run check-env`

```env
MOLLIE_API_KEY=test_xxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_SECRET=xxx
YOUSIGN_API_KEY=xxx
YOUSIGN_ENV=sandbox
RESEND_API_KEY=re_xxx
EMAIL_FROM=Optimum <noreply@votredomaine.com>
```

## Lancement

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## Parcours

### Décennale BTP
`/devis` → `/souscription` → `/creer-compte` → `/signature` → `/paiement` → `/confirmation`

### Dommage ouvrage
`/devis-dommage-ouvrage` (demande) → Gestion crée le devis → Email au client → `/espace-client` → Paiement Mollie

## Webhooks (développement local)

Utiliser [ngrok](https://ngrok.com) pour exposer le serveur :
- Mollie : `https://xxx.ngrok-free.app/api/mollie/webhook`
- Yousign : `https://xxx.ngrok-free.app/api/yousign/webhook`

## Déploiement

- **[MISE-EN-LIGNE.md](./MISE-EN-LIGNE.md)** — Étapes à suivre pour déployer (guide pas à pas)
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Référence technique complète
