"use client"

import { readResponseJson } from "@/lib/read-response-json"

export type ClientSireneLookupResult = {
  raisonSociale: string
  adresse: string
  codePostal: string
  ville: string
  dateCreationSociete?: string
}

type ClientSireneLookupResponse = ClientSireneLookupResult & {
  error?: string
}

export function normalizeSiretForLookup(value: string): string {
  return value.replace(/\D/g, "").slice(0, 14)
}

export async function fetchClientSireneLookup(rawSiret: string): Promise<ClientSireneLookupResult> {
  const siret = normalizeSiretForLookup(rawSiret)
  if (siret.length !== 14) {
    throw new Error("SIRET invalide (14 chiffres)")
  }

  const res = await fetch(`/api/siret?siret=${encodeURIComponent(siret)}`)
  const json = await readResponseJson<ClientSireneLookupResponse>(res)
  if (!res.ok) {
    throw new Error(json.error || "Entreprise introuvable")
  }

  return {
    raisonSociale: json.raisonSociale || "",
    adresse: json.adresse || "",
    codePostal: json.codePostal || "",
    ville: json.ville || "",
    ...(json.dateCreationSociete ? { dateCreationSociete: json.dateCreationSociete } : {}),
  }
}
