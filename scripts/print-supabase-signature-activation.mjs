#!/usr/bin/env node
/**
 * La signature électronique est intégrée à l'application.
 * Usage : npm run print:supabase-signature
 */

console.log(`
══════════════════════════════════════════════════════════════
  Signature électronique intégrée
══════════════════════════════════════════════════════════════

Les nouvelles demandes se créent dans l'application :
  /api/sign/create-request  et  /api/gestion/sign/…
Le PDF reste dans le dossier. Le client signe sur /sign/[id].

Supabase n'est plus utilisé pour signer.
Les clés Supabase servent encore à la GED et à la lecture
des anciens devis déjà stockés dans « signed_documents ».

══════════════════════════════════════════════════════════════
`)
