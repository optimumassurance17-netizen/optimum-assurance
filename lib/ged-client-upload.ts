import { GED_INLINE_UPLOAD_MAX_BYTES } from "@/lib/ged-policy"
import { readResponseJson } from "@/lib/read-response-json"

type GedUploadJson = {
  error?: string
  id?: string
  type?: string
  filename?: string
  createdAt?: string
  ok?: boolean
  request?: unknown
  signedUrl?: string
  token?: string
  receipt?: string
}

async function readJson(res: Response): Promise<GedUploadJson> {
  return readResponseJson<GedUploadJson>(res)
}

/**
 * Dépose un fichier GED.
 * En dessous de 3,5 Mo, le fichier transite par le site.
 * Au-dessus, il part directement vers le stockage, puis le site n'enregistre que la référence.
 */
export async function sendGedUpload(
  url: string,
  file: File,
  fields: Record<string, string>
): Promise<GedUploadJson> {
  if (file.size <= GED_INLINE_UPLOAD_MAX_BYTES) {
    const body = new FormData()
    body.set("file", file)
    for (const [key, value] of Object.entries(fields)) body.set(key, value)
    const res = await fetch(url, { method: "POST", body })
    const json = await readJson(res)
    if (!res.ok) throw new Error(json.error || "Erreur lors de l'upload")
    return json
  }

  const prepareRes = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prepare: true,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      ...fields,
    }),
  })
  const prepared = await readJson(prepareRes)
  if (!prepareRes.ok || !prepared.signedUrl || !prepared.receipt) {
    throw new Error(prepared.error || "Le dépôt du fichier volumineux est indisponible.")
  }

  const payload = new FormData()
  payload.append("cacheControl", "3600")
  payload.append("", file)
  let put: Response
  try {
    put = await fetch(prepared.signedUrl, {
      method: "PUT",
      headers: {
        "x-upsert": "true",
        ...(prepared.token ? { Authorization: `Bearer ${prepared.token}` } : {}),
      },
      body: payload,
    })
  } catch {
    throw new Error("Le stockage n'a pas accepté le fichier. Réessayez, ou déposez un fichier de moins de 4 Mo.")
  }
  if (!put.ok) {
    throw new Error("Le stockage a refusé ce fichier. Réessayez, ou déposez un fichier de moins de 4 Mo.")
  }

  const confirmRes = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirm: true, receipt: prepared.receipt }),
  })
  const confirmed = await readJson(confirmRes)
  if (!confirmRes.ok) throw new Error(confirmed.error || "Le fichier n'a pas été enregistré.")
  return confirmed
}
