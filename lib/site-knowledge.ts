/**
 * Connaissance « site » pour l’assistant IA (chat) et documentation interne.
 * À tenir à jour quand les parcours ou URLs changent.
 */

export const SITE_KNOWLEDGE = `
## Navigation et pages principales
- **Accueil /** : présentation, simulateur de prime, liens vers devis.
- **Assurance décennale BTP** : **/devis** (tarif automatique en quelques minutes). Pages SEO métiers : **/assurance-decennale/[metier]** (ex. plombier, électricien).
- **Dommage ouvrage** : **/devis-dommage-ouvrage** (formulaire 5 étapes). Pages SEO : **/dommage-ouvrage/[slug]** (auto-construction, particulier, etc.).
- **RC fabriquant** : **/devis-rc-fabriquant** — formulaire en **4 étapes** (entreprise, type de produit / zone / sous-traitance, CA, sinistralité) ; **pas de tarif affiché** au prospect. Email de confirmation et alerte équipe ; en **gestion** : suivi, e-mail de proposition, **indicatifs internes** (score / prime indicative), puis contrat plateforme après signature PDF personnalisé. **Cotisation en logique trimestrielle** (comme la décennale) : chaque échéance = **virement Mollie** au montant du contrat (ajustable en **/gestion**), pas de SEPA auto dédié RC sur ce flux — relances et montants **pilotés manuellement**.
- **Contenu** : **/faq**, **/guides** et **/guides/[slug]** (guides pratiques), **/contact** (formulaire), **/cgv**, **/conditions-generales-dommage-ouvrage** (CG produit DO, avec le devis), **/conditions-attestations** (émission et validité des attestations décennale / DO), **/mentions-legales**, **/confidentialite**, **/droits-personnes**.
- **API PDF (pdf-lib, POST, application/pdf)** : **/api/pdf/decennale/quote**, **/policy**, **/certificate** ; **/api/pdf/do/quote**, **/policy**, **/certificate**. Optionnel : variable d’environnement PDF_API_SECRET + en-tête Authorization Bearer. Vérification par numéro de contrat : **/verify/[contractNumber]** (InsuranceContract SaaS ou redirection vers **/v/[token]** pour anciennes attestations).
- **Cycle de vie contrats (Prisma, pas Supabase)** : **POST /api/contracts/create**, **/api/contracts/validate** (admin), **/api/contracts/pay** (Mollie virement, metadata insurance_contract), **GET /api/contracts/[id]/pdf/[docType]**, **POST /api/pdf/generate**, **POST /api/contracts/[id]/regenerate** (admin), **PATCH /api/gestion/insurance-contracts/[id]** (prime / prochaine échéance, admin). Webhook Mollie enrichi pour activer le contrat et générer les PDF. **/gestion** : tableau **Contrats plateforme** (actions manuelles) ; **/admin** : liste filtrable (100 derniers).
- **Compte** : **/connexion**, **/creer-compte**, **/mot-de-passe-oublie**, **/reinitialiser-mot-de-passe**.
- **Espace client** (connecté) : **/espace-client** — liste des documents, profil ; **/espace-client/documents/[id]** — détail d’un document (devis, contrat, attestation, DO…) ; **/espace-client/regularisation** — régularisation d’impayé **décennale** uniquement (le DO est payé en une fois avant l’attestation).
- **Reprise de devis** : lien par email **/devis/resume/[token]** (brouillon sauvegardé 7 jours).
- **Étude dossier complexe** : si le devis décennale nécessite une étude (ex. **plusieurs sinistres**), redirection vers **/etude** après le formulaire. Si le client **ne trouve pas son activité** dans la liste : page **/etude/domaine** (demande d'étude pour cas spécifique).
- **Vérification publique d’attestation** : **/v/[token]** (QR code / lien de vérification).

## Parcours assurance décennale BTP (ordre réel)
1. **/devis** — Saisie CA, activités, options ; tarif immédiat **affiché en équivalent mensuel** (prime ÷ 12), avec rappel du **prélèvement trimestriel** ; possibilité de sauvegarder le brouillon par email.
2. **/souscription** — Coordonnées entreprise, SIRET, représentant, activités.
3. **/creer-compte** — Email + mot de passe ; création des données côté serveur.
4. **/signature** — Signature électronique du contrat (puis **/sign/[id]** pour apposer la signature sur le PDF).
5. **/mandat-sepa** — IBAN et mandat ; **prélèvement trimestriel uniquement** (pas d’option mensuelle).
6. **/paiement** — **Premier trimestre + 60 € de frais de gestion** payés par **carte bancaire (Mollie)** ; les trimestres suivants sont prévus en **prélèvement SEPA** sur l’IBAN du mandat.
7. **/confirmation** — Après validation du paiement, **attestation** disponible rapidement dans l’espace client (PDF, QR de vérification).

## Parcours RC fabriquant
1. **/devis-rc-fabriquant** — Formulaire en **4 étapes** : entreprise (e-mail, raison sociale, **SIRET 14 chiffres**, téléphone, activité, année de création) ; fabricant (type de produit, zone France/Europe/Monde, sous-traitance, contrôle qualité, questions certification/tests pour batterie/électronique) ; CA total (obligatoire), export, effectifs ; sinistralité et message. Envoi → lead + **indicatifs internes** (score / prime indicative) pour la gestion uniquement — **aucun tarif affiché** au prospect.
2. Après étude : e-mail de proposition ; **signature** du PDF personnalisé ; **contrat plateforme** (modèle Prisma InsuranceContract) RC Fabriquant. **Paiements** : virement Mollie **par échéance** (montant = prime sur le contrat, souvent ¼ de la prime annuelle — à fixer en gestion). **Échéances suivantes** : la gestion met à jour la prime et le client repaye depuis l’espace client (pas de prélèvement SEPA RC automatisé sur ce produit).

## Parcours dommage ouvrage (DO)
1. **/devis-dommage-ouvrage** — Questionnaire en **5 étapes** (souscripteur, opération, ouvrage et coûts, terrain et technique, garanties). Brouillon enregistré localement dans le navigateur.
2. Envoi → demande enregistrée ; **prix définitif sous ~24 h** après étude par l’équipe.
3. Le devis est **ajouté à l’espace client** après traitement ; dépôt de pièces (permis, DOC, plans…) en **GED**.
4. **Signature électronique** du contrat.
5. **Paiement par virement bancaire** via **Mollie** (instructions sécurisées).
6. **Attestation** après **réception des fonds** (pas immédiate comme la décennale carte).

## Différences décennale vs DO (résumé)
- **Décennale** : tarif tout de suite (affichage **équivalent mensuel** sur le site, **prélèvement réel trimestriel**) ; **1er trimestre + frais en CB** puis **SEPA trimestriel** ; attestation peu après paiement en ligne.
- **DO** : tarif après étude ; **virement** ; attestation après encaissement.

## Outils techniques (information générale)
- **Paiements** : **Mollie** (carte, virement selon produit). **Signature** : parcours **/signature** puis page **/sign/[id]** (PDF + signature manuscrite sur le document).
- **Support** : **100 % en ligne** — pas de ligne téléphonique ; email **contact@optimum-assurance.fr**, formulaire **/contact**, ce **chat**.

## Limites de cet assistant
- Tu n’as **pas accès** aux comptes clients, dossiers, paiements ou statuts personnels.
- Pour toute question sur **un dossier précis** (impayé, document manquant, sinistre individuel), orienter vers **contact@optimum-assurance.fr** ou l’**espace client** après connexion.
- Tu fournis des **informations générales** sur les parcours et le site, pas un avis juridique personnalisé.
`.trim()
