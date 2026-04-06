-- =============================================================================
-- Remplissage SEO Supabase — à coller dans : Supabase → SQL → New query → Run
-- Prérequis : avoir exécuté sql/supabase-seo-programmatic.sql (tables + RLS).
-- Les slugs métiers / types DO / villes doivent correspondre au site Next.js.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) VILLES (slug en minuscules, sans accent pour l’URL)
-- ---------------------------------------------------------------------------
insert into public.villes (nom, slug, population)
values
  ('Paris', 'paris', 2161000),
  ('Lyon', 'lyon', 522000),
  ('Marseille', 'marseille', 870000),
  ('Toulouse', 'toulouse', 490000),
  ('Nice', 'nice', 350000),
  ('Nantes', 'nantes', 320000),
  ('Montpellier', 'montpellier', 290000),
  ('Strasbourg', 'strasbourg', 290000),
  ('Bordeaux', 'bordeaux', 260000),
  ('Lille', 'lille', 235000),
  ('Rennes', 'rennes', 220000),
  ('Reims', 'reims', 185000),
  ('Saint-Étienne', 'saint-etienne', 175000),
  ('Le Havre', 'le-havre', 170000),
  ('Grenoble', 'grenoble', 160000)
on conflict (slug) do update set
  nom = excluded.nom,
  population = excluded.population;

-- ---------------------------------------------------------------------------
-- 2) MÉTIERS DÉCENNALE (mêmes slugs que lib/metiers-seo.ts)
-- ---------------------------------------------------------------------------
insert into public.metiers (nom, slug, description, risques, prix_moyen)
values
  ('Plombier', 'plombier', 'Plomberie et chauffage : réseaux d’eau et évacuation.', 'Fuites, désordres sur réseaux.', 950),
  ('Électricien', 'electricien', 'Électricité bâtiment et courants faibles.', 'Désordres sur installations encastrées.', 1050),
  ('Peintre', 'peintre', 'Peinture et ravalement en bâtiment.', 'Désordres de finition liés à la préparation des supports.', 720),
  ('Carreleur', 'carreleur', 'Pose de carrelage et faïence.', 'Désordres d’adhérence et d’étanchéité.', 800),
  ('Maçon', 'macon', 'Gros œuvre, maçonnerie, fondations.', 'Fissures, tassements, désordres structurels.', 1200),
  ('Couvreur', 'couvreur', 'Couverture, étanchéité toiture.', 'Infiltrations, désordres d’étanchéité.', 1000),
  ('Menuisier', 'menuisier', 'Menuiserie extérieure et intérieure.', 'Désordres sur ouvertures et fermetures.', 900),
  ('Charpentier', 'charpentier', 'Charpente bois et métallique.', 'Désordres de structure.', 1100)
on conflict (slug) do update set
  nom = excluded.nom,
  description = excluded.description,
  risques = excluded.risques,
  prix_moyen = excluded.prix_moyen;

-- ---------------------------------------------------------------------------
-- 3) TYPES DE PROJET DO (mêmes slugs que lib/dommage-ouvrage-seo.ts)
-- ---------------------------------------------------------------------------
insert into public.types_projets (nom, slug, description)
values
  ('Auto-construction', 'auto-construction', 'Particulier qui coordonne lui-même son chantier.'),
  ('Particulier faisant construire', 'particulier', 'Maître d’ouvrage particulier, maison individuelle ou jumelée.'),
  ('Constructeur et promoteur', 'constructeur-promoteur', 'Programmes immobiliers, logements collectifs, VEFA.'),
  ('Garantie clos et couvert', 'clos-et-couvert', 'Garantie limitée aux lots structure pour réduire la prime.')
on conflict (slug) do update set
  nom = excluded.nom,
  description = excluded.description;

-- ---------------------------------------------------------------------------
-- 4) PAGES DÉCENNALE × VILLE — toutes les combinaisons (texte unique par page)
--    URLs : /assurance-decennale/{metier}/{ville}
-- ---------------------------------------------------------------------------
insert into public.seo_decennale_ville (metier_id, ville_id, body_extra, indexable, content_hash)
select
  m.id,
  v.id,
  'À ' || v.nom || ', l’assurance décennale « ' || m.nom || ' » est obligatoire (loi Spinetta) dès qu’il existe un contrat direct avec le maître d’ouvrage. '
  || 'Optimum Assurance propose un devis en ligne en quelques minutes et une attestation conforme, avec prélèvement trimestriel. '
  || 'Adaptez ce paragraphe : précisez les risques typiques à ' || v.nom || ' (milieu urbain, sécheresse, etc.).',
  true,
  encode(
    sha256(
      convert_to('decennale|' || m.slug || '|' || v.slug || '|v1', 'utf8')
    ),
    'hex'
  )
from public.metiers m
cross join public.villes v
on conflict (metier_id, ville_id) do update set
  body_extra = excluded.body_extra,
  indexable = excluded.indexable,
  content_hash = excluded.content_hash;

-- ---------------------------------------------------------------------------
-- 5) PAGES DO × VILLE — toutes les combinaisons
--    URLs : /dommage-ouvrage/{type}/{ville}
-- ---------------------------------------------------------------------------
insert into public.seo_do_ville (type_projet_id, ville_id, body_extra, indexable, content_hash)
select
  t.id,
  v.id,
  'À ' || v.nom || ', l’assurance dommage ouvrage pour un projet de type « ' || t.nom || ' » couvre les dommages affectant la solidité de l’ouvrage pendant la construction et jusqu’à 10 ans après réception. '
  || 'Demandez un devis en ligne : étude et tarif définitif sous environ 24 h. Personnalisez ce texte selon la région et le type de construction.',
  true,
  encode(
    sha256(
      convert_to('do|' || t.slug || '|' || v.slug || '|v1', 'utf8')
    ),
    'hex'
  )
from public.types_projets t
cross join public.villes v
on conflict (type_projet_id, ville_id) do update set
  body_extra = excluded.body_extra,
  indexable = excluded.indexable,
  content_hash = excluded.content_hash;

-- ---------------------------------------------------------------------------
-- 6) Vérification rapide (optionnel)
-- ---------------------------------------------------------------------------
-- select count(*) as pages_decennale from public.seo_decennale_ville;
-- select count(*) as pages_do from public.seo_do_ville;
-- select slug from public.villes order by population desc nulls last limit 5;
