# Optimum Assurance — Assurance décennale & dommage ouvrage

Site de souscription d'assurance décennale BTP et dommage ouvrage avec tarification automatique, signature électronique sur PDF (Supabase Storage + `/api/sign`) et paiement Mollie.

## Fonctionnalités

- **Assurance décennale** : Devis en 3 min (tarif affiché en **équivalent mensuel**, paiement **trimestriel**), signature électronique (`/signature` → `/sign/[id]`), 1er trimestre + frais par carte puis SEPA trimestriel, attestation rapide
- **Dommage ouvrage** : Demande en ligne, devis sous ~24 h, paiement par virement Mollie, attestation après encaissement
- **Tarification automatique** : CA, sinistres, activités, historique
- **Signature électronique** : PDF sur la page dédiée, finalisation côté serveur (Prisma + Supabase)
- **Paiement** : Mollie (décennale : carte + SEPA ; DO : virement)
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
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_xxx
EMAIL_FROM=Optimum <noreply@votredomaine.com>
```

## Lancement

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## Parcours

Documentation détaillée : **[docs/PARCOURS.md](./docs/PARCOURS.md)** (récap DO vs décennale, tableau des étapes). **Activité non listée au devis** : page **`/etude/domaine`** (demande d’étude dédiée).

### Dommage ouvrage (DO)

1. **`/devis-dommage-ouvrage`** — Formulaire 5 étapes → enregistrement de la demande (prix définitif sous ~24 h après étude).
2. **Espace client** — Devis ajouté après traitement ; GED pour les pièces (permis, DOC, plans…).
3. **Signature** — Contrat signé électroniquement (parcours communiqué depuis l’espace client ou par l’équipe).
4. **Mollie** — Paiement par **virement bancaire** ; attestation après **réception des fonds**.

### Assurance décennale BTP

`/devis` → `/souscription` → `/creer-compte` → `/signature` → `/mandat-sepa` → `/paiement` → `/confirmation`

- **Paiement** : 1er trimestre + 60 € frais en **carte bancaire** ; suivants en **prélèvement SEPA trimestriel** (les montants du site sont des équivalents mensuels à titre indicatif).
- **Attestation** : disponible peu après validation du paiement en ligne.

FAQ site : `/faq#parcours-do` et `/faq#parcours-decennale`

## Webhooks (développement local)

Utiliser [ngrok](https://ngrok.com) pour exposer le serveur :
- Mollie : `https://xxx.ngrok-free.app/api/mollie/webhook`

## Déploiement

- **[MISE-EN-LIGNE.md](./MISE-EN-LIGNE.md)** — Étapes à suivre pour déployer (guide pas à pas)
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Référence technique complète
- **[docs/OPS-CHECKLIST.md](./docs/OPS-CHECKLIST.md)** — Checklist rapide (HTTPS, crons, webhooks, ORIAS…)
- **[docs/SEPA-RECURRENT-MOLLIE.md](./docs/SEPA-RECURRENT-MOLLIE.md)** — Feuille de route prélèvements SEPA T2–T4 (Mollie)
