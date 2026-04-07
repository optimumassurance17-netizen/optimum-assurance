import { Prisma } from "@/lib/prisma-client"
import { prisma } from "@/lib/prisma"

const PATTERN = /^OPT-(DEC|DO|RC)-(\d{4})-(\d{4})$/

export function isValidContractNumberFormat(num: string): boolean {
  return PATTERN.test(num.trim())
}

/**
 * Alloue un numéro unique séquentiel (atomique côté PostgreSQL).
 */
export async function allocateNextContractNumber(
  product: "decennale" | "do" | "rc_fabriquant"
): Promise<string> {
  const year = new Date().getFullYear()
  const code = product === "decennale" ? "DEC" : product === "do" ? "DO" : "RC"

  const rows = await prisma.$queryRaw<Array<{ lastSeq: number }>>(
    Prisma.sql`
      INSERT INTO "ContractCounter" ("year", "product", "lastSeq")
      VALUES (${year}, ${code}, 1)
      ON CONFLICT ("year", "product") DO UPDATE
      SET "lastSeq" = "ContractCounter"."lastSeq" + 1
      RETURNING "lastSeq"
    `
  )

  const seq = rows[0]?.lastSeq ?? 1
  return `OPT-${code}-${year}-${String(seq).padStart(4, "0")}`
}
