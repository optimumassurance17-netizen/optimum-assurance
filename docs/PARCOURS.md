# Parcours de souscription — Optimum Assurance

Documentation de référence pour les parcours **dommage ouvrage (DO)** et **assurance décennale BTP**, alignée sur l’application.

---

## Dommage ouvrage (DO)

| Étape | Description |
|--------|-------------|
| **Entrée** | Page [`/devis-dommage-ouvrage`](https://www.optimum-assurance.fr/devis-dommage-ouvrage), fiches SEO `/dommage-ouvrage/...`, guides. |
| **Devis en ligne** | Formulaire en **5 étapes** : Souscripteur → Opération → Ouvrage & coûts → Terrain & technique → Garanties & réalisateurs. Brouillon possible (localStorage). |
| **Envoi** | Enregistrement d’une demande (lead) + email d’estimation avec le lien **/souscription-dommage-ouvrage**. |
| **Souscription** | **/souscription-dommage-ouvrage** reprend la demande (session du navigateur ou, une fois connecté, dernière demande du même email). Le particulier sans SIRET reste éligible. |
| **Paiement** | **Virement unique** Mollie du montant indiqué (prime entière). Un dossier à risque reste en étude : le même virement unique s’ouvre dans l’espace client après acceptation. |
| **Espace client** | Suivi, questionnaire d’étude en complément, **GED** (permis, DOC, plans), bouton de virement unique. |
| **Attestation** | Délivrée après **réception des fonds** sur le compte indiqué. |

**Résumé** : demande web → souscription en ligne → virement unique → attestation après encaissement.

---

## Assurance décennale BTP

| Étape | Route | Rôle |
|--------|--------|------|
| 1. **Devis** | `/devis` (ou pages métiers `/assurance-decennale/[metier]`) | Tarif automatique, **affiché en équivalent mensuel** (prime ÷ 12) avec **montants d’échéance trimestriels** ; possibilité de sauvegarder le brouillon par email (`/devis/resume/[token]`). Si l’activité n’est pas dans la liste : **`/etude/domaine`** (demande d’étude). |
| 2. **Souscription** | `/souscription` | Coordonnées entreprise, SIRET, activités. |
| 3. **Compte** | `/creer-compte` | Email + mot de passe ; création des documents côté serveur. |
| 4. **Signature** | `/signature` puis **`/sign/[id]`** | PDF du contrat, signature manuscrite sur le document ; finalisation serveur (`POST /api/sign`). |
| 5. **Mandat SEPA** | `/mandat-sepa` | IBAN ; périodicité **trimestrielle**. |
| 6. **Paiement** | `/paiement` | **1er trimestre + frais de gestion (60 €)** en **carte bancaire (Mollie)** ; échéances suivantes en **prélèvement SEPA trimestriel**. |
| 7. **Confirmation** | `/confirmation` | Attestation disponible **rapidement** après validation du paiement. |

**Étude personnalisée** (sinistres multiples depuis `/devis`, ou activité non listée `/etude/domaine`) : recontact **sous 24 h**.

**Stepper UI** : Devis → Souscription → Compte → Signature → IBAN & SEPA → Paiement.

**Résumé** : devis immédiat → souscription → compte → signature (`/sign`) → mandat → CB (1er trimestre + frais) → SEPA trimestriel → attestation.

---

## Différences clés

| | **DO** | **Décennale** |
|---|--------|----------------|
| **Tarif** | Indicatif puis prix après **étude (~24 h)** | **Immédiat** (simulateur / devis) — montants en **équivalent mensuel** sur le site, **prélèvement trimestriel** |
| **Paiement** | **Virement** Mollie | **Carte** (1er trimestre + frais) puis **SEPA** trimestriel |
| **Attestation** | Après **encaissement du virement** | Après **validation du paiement** en ligne |

---

## Assistant IA (chat)

Le fichier **`lib/site-knowledge.ts`** décrit le fonctionnement du site pour le prompt de l’assistant (routes, parcours, limites). À synchroniser avec ce document lors d’un changement de parcours.

---

*Dernière mise à jour : avril 2026.*
