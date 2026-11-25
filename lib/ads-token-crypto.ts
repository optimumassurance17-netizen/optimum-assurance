import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"

function encryptionKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET?.trim()
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET manquant : le jeton Google ne peut pas être enregistré.")
  }
  return createHash("sha256").update(secret).digest()
}

/** AES-256-GCM. Le format est iv.tag.cipher, en base64url. */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".")
}

export function decryptSecret(payload: string): string {
  const [ivPart, tagPart, dataPart] = payload.split(".")
  if (!ivPart || !tagPart || !dataPart) {
    throw new Error("Jeton enregistré illisible.")
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivPart, "base64url")
  )
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"))
  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}
