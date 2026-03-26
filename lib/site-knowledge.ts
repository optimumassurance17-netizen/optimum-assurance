/**
 * Connaissance « site » pour l’assistant IA (chat) et documentation interne.
 * À tenir à jour quand les parcours ou URLs changent.
 */

export const SITE_KNOWLEDGE = `
## Navigation et pages principales
- **Accueil /** : présentation, simulateur de prime, liens vers devis.
- **Assurance décennale BTP** : **/devis** (tarif automatique en quelques minutes). Pages SEO métiers : **/assurance-decennale/[metier]** (ex. plombier, électricien).
- **Dommage ouvrage** : **/devis-dommage-ouvrage** (formulaire 5 étapes). Pages SEO : **/dommage-ouvrage/[slug]** (auto-construction, particulier, etc.).
- **Contenu** : **/faq**, **/guides** et **/guides/[slug]** (guides pratiques), **/contact** (formulaire), **/cgv**, **/mentions-legales**, **/confidentialite**, **/droits-personnes**.
- **Compte** : **/connexion**, **/creer-compte**, **/mot-de-passe-oublie**, **/reinitialiser-mot-de-passe**.
- **Espace client** (connecté) : **/espace-client** — liste des documents, profil ; **/espace-client/documents/[id]** — détail d’un document (devis, contrat, attestation, DO…) ; **/espace-client/regularisation** — régularisation d’impayé si applicable.
- **Reprise de devis** : lien par email **/devis/resume/[token]** (brouillon sauvegardé 7 jours).
- **Étude dossier complexe** : si le devis décennale nécessite une étude (ex. **plusieurs sinistres**), redirection vers **/etude** après le formulaire. Si le client **ne trouve pas son activité** dans la liste : page **/etude/domaine** (demande d'étude pour cas spécifique).
- **Vérification publique d’attestation** : **/v/[token]** (QR code / lien de vérification).

## Parcours assurance décennale BTP (ordre réel)
1. **/devis** — Saisie CA, activités, options ; tarif immédiat **affiché en équivalent mensuel** (prime ÷ 12), avec rappel du **prélèvement trimestriel** ; possibilité de sauvegarder le brouillon par email.
2. **/souscription** — Coordonnées entreprise, SIRET, représentant, activités.
3. **/creer-compte** — Email + mot de passe ; création des données côté serveur.
4. **/signature** — Signature électronique du contrat (**Yousign**).
5. **/mandat-sepa** — IBAN et mandat ; **prélèvement trimestriel uniquement** (pas d’option mensuelle).
6. **/paiement** — **Premier trimestre + 60 € de frais de gestion** payés par **carte bancaire (Mollie)** ; les trimestres suivants sont prévus en **prélèvement SEPA** sur l’IBAN du mandat.
7. **/confirmation** — Après validation du paiement, **attestation** disponible rapidement dans l’espace client (PDF, QR de vérification).

## Parcours dommage ouvrage (DO)
1. **/devis-dommage-ouvrage** — Questionnaire en **5 étapes** (souscripteur, opération, ouvrage et coûts, terrain et technique, garanties). Brouillon enregistré localement dans le navigateur.
2. Envoi → demande enregistrée ; **prix définitif sous ~24 h** après étude par l’équipe.
3. Le devis est **ajouté à l’espace client** après traitement ; dépôt de pièces (permis, DOC, plans…) en **GED**.
4. **Signature Yousign** du contrat.
5. **Paiement par virement bancaire** via **Mollie** (instructions sécurisées).
6. **Attestation** après **réception des fonds** (pas immédiate comme la décennale carte).

## Différences décennale vs DO (résumé)
- **Décennale** : tarif tout de suite (affichage **équivalent mensuel** sur le site, **prélèvement réel trimestriel**) ; **1er trimestre + frais en CB** puis **SEPA trimestriel** ; attestation peu après paiement en ligne.
- **DO** : tarif après étude ; **virement** ; attestation après encaissement.

## Outils techniques (information générale)
- **Paiements** : **Mollie** (carte, virement selon produit). **Signature** : **Yousign** (eIDAS).
- **Support** : **100 % en ligne** — pas de ligne téléphonique ; email **contact@optimum-assurance.fr**, formulaire **/contact**, ce **chat**.

## Limites de cet assistant
- Tu n’as **pas accès** aux comptes clients, dossiers, paiements ou statuts personnels.
- Pour toute question sur **un dossier précis** (impayé, document manquant, sinistre individuel), orienter vers **contact@optimum-assurance.fr** ou l’**espace client** après connexion.
- Tu fournis des **informations générales** sur les parcours et le site, pas un avis juridique personnalisé.
`.trim()
