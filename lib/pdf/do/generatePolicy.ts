import type { InsuranceData } from "../types"
import { generateDOQuotePolicyBundle } from "./generateQuotePolicyBundle"

/**
 * Police DO : même document que le contrat (devis, opération, conditions particulières et mentions juridiques).
 */
export async function generateDOPolicy(data: InsuranceData): Promise<Uint8Array> {
  return generateDOQuotePolicyBundle(data, "contrat")
}
