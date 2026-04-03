-- À exécuter après supabase-esign-mvp.sql (éditeur SQL Supabase).
-- Crée les buckets si absents (PDF uniquement, buckets privés — l’app utilise des URL signées).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('documents', 'documents', false, 52428800, array['application/pdf']::text[]),
  ('signed_documents', 'signed_documents', false, 52428800, array['application/pdf']::text[])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
