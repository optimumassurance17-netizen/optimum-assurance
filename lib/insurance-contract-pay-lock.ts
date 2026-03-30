import { createHash } from "crypto"

/**
 * Clés pour pg_advisory_xact_lock — sérialise les POST /api/contracts/pay pour un même contrat (évite deux paiements Mollie en parallèle).
 */
export function insuranceContractPayLockKeys(contractId: string): [number, number] {
  const buf = createHash("sha256").update(`insurance-contract-pay:${contractId}`).digest()
  return [buf.readUInt32BE(0) & 0x7fffffff, buf.readUInt32BE(4) & 0x7fffffff]
}
