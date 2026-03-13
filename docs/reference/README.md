# Références documents

Ce dossier contient les documents de référence utilisés pour les templates de l'application.

## Proposition client Dommage Ouvrage

**Fichier attendu :** `Proposition-853957.pdf`

Ce PDF sert de modèle pour le template de proposition d'assurance dommage ouvrage (`components/documents/DevisDoTemplate.tsx`).

Pour vérifier l'alignement du parcours avec le document officiel :
1. Placer le PDF dans ce dossier
2. Comparer les sections : en-tête, caractéristiques du risque, opération de construction, prime proposée, garanties, exclusions, conditions de validité

## Parcours concernés

- **Client** : `/devis-dommage-ouvrage` — demande de devis (étude sous 24h)
- **Gestion** : `/gestion` — création manuelle de la proposition PDF
- **Espace client** : document devis DO avec paiement Mollie
