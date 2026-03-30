export const CONTRACT_STATUS = {
  draft: "draft",
  pending_validation: "pending_validation",
  approved: "approved",
  paid: "paid",
  active: "active",
  rejected: "rejected",
} as const

export type ContractStatus = (typeof CONTRACT_STATUS)[keyof typeof CONTRACT_STATUS]

export function isContractStatus(s: string): s is ContractStatus {
  return Object.values(CONTRACT_STATUS).includes(s as ContractStatus)
}
