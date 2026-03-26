# Prélèvements SEPA trimestriels (T2–T4) — implémentation

## Parcours

1. **1er trimestre** : paiement **carte** (Mollie), métadonnées avec `premierPaiementCarte`, `iban`, `titulaireCompte`, `primeAnnuelle` (`app/paiement/page.tsx`).
2. **Webhook** `POST /api/mollie/webhook` : après paiement `paid`, création **Customer Mollie** + **mandat** `directdebit` sur l’IBAN, enregistrement **`SepaSubscription`** (`lib/mollie-sepa.ts` → `setupSepaSubscriptionAfterT1Card`).
3. **Cron** `GET /api/cron/sepa-trimestriel` (sécurisé par `CRON_SECRET`, planifié dans `vercel.json`) : pour chaque abonnement avec `nextSepaDue` atteint, `customerPayments.create` avec `sequenceType: recurring`, `mandateId`, `sepaPendingPaymentId` pour éviter les doublons avant réponse webhook.
4. **Webhook** : `metadata.type === sepa_trimestre` → incrémente `trimestresSepaPayes`, recalcule `nextSepaDue` (+3 mois) ou `completed` ; échec → `lastError` et libère `sepaPendingPaymentId`.

## Objectif métier

- Montant : `primeTrimestrielle` = `primeAnnuelle / 4` (arrondi comme sur la page paiement / `lib/mollie-sepa.ts` → `primeTrimestrielle`).
- Calendrier : `nextSepaDue` = +3 mois après le paiement T1 (carte), puis +3 mois après chaque prélèvement SEPA réussi.

## Données

- Table **`SepaSubscription`** (`prisma/schema.prisma`) : `mollieCustomerId`, `mollieMandateId`, `primeAnnuelle`, `trimestresSepaPayes`, `nextSepaDue`, `sepaPendingPaymentId`, etc.
- Variables : `MOLLIE_API_KEY`, `NEXT_PUBLIC_APP_URL` (webhook), `CRON_SECRET` (cron).

## Hors périmètre code seul

- Activation SEPA / mandats sur le **dashboard Mollie**.
- Conseil juridique sur les échéances contractuelles.

## Référence

- [TODO.md](../TODO.md)
- `lib/mollie-sepa.ts`, `app/api/mollie/webhook/route.ts`, `app/api/cron/sepa-trimestriel/route.ts`
