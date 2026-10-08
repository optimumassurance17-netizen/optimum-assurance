import { Prisma } from "@/lib/prisma-client"
import { prisma } from "@/lib/prisma"
import {
  buildUserCleanupPlan,
  normalizeAccountEmail,
  normalizeAccountSiret,
  type AccountForeignKey,
  type AccountPredicate,
} from "@/lib/client-account-plan"

export {
  buildUserCleanupPlan,
  normalizeAccountEmail,
  normalizeAccountSiret,
  type AccountCleanupStep,
  type AccountForeignKey,
  type AccountPredicate,
} from "@/lib/client-account-plan"

const SQL_IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/

export type ClientAccountMatch = {
  id: string
  email: string
  raisonSociale: string | null
  matchedBy: "email" | "siret"
}

function quoteIdent(name: string): Prisma.Sql {
  if (!SQL_IDENT.test(name)) {
    throw new Error("Identifiant SQL inattendu")
  }
  return Prisma.raw(`"${name}"`)
}

function whereSql(where: AccountPredicate, userId: string): Prisma.Sql {
  if (where.kind === "eq") {
    return Prisma.sql`${quoteIdent(where.column)} = ${userId}`
  }
  return Prisma.sql`${quoteIdent(where.column)} IN (SELECT ${quoteIdent(where.parentColumn)} FROM ${quoteIdent(where.parentTable)} WHERE ${whereSql(where.parent, userId)})`
}

async function loadUserForeignKeys(): Promise<AccountForeignKey[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      child_table: string
      child_column: string
      parent_table: string
      parent_column: string
      child_nullable: boolean
    }>
  >`
    SELECT
      child.relname AS child_table,
      child_att.attname AS child_column,
      parent.relname AS parent_table,
      parent_att.attname AS parent_column,
      NOT child_att.attnotnull AS child_nullable
    FROM pg_constraint c
    JOIN pg_class child ON child.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = child.relnamespace
    JOIN pg_class parent ON parent.oid = c.confrelid
    JOIN pg_attribute child_att
      ON child_att.attrelid = c.conrelid AND child_att.attnum = c.conkey[1]
    JOIN pg_attribute parent_att
      ON parent_att.attrelid = c.confrelid AND parent_att.attnum = c.confkey[1]
    WHERE c.contype = 'f'
      AND ns.nspname = 'public'
      AND cardinality(c.conkey) = 1
      AND cardinality(c.confkey) = 1
  `
  return rows.map((row) => ({
    childTable: row.child_table,
    childColumn: row.child_column,
    parentTable: row.parent_table,
    parentColumn: row.parent_column,
    childNullable: row.child_nullable,
  }))
}

export async function deleteClientAccount(userId: string): Promise<void> {
  const foreignKeys = await loadUserForeignKeys()
  const steps = buildUserCleanupPlan(foreignKeys)
  await prisma.$transaction(async (tx) => {
    const pending = await tx.$queryRaw<Array<{ reg: string | null }>>`
      SELECT to_regclass('public."PendingSignature"')::text AS reg
    `
    if (pending[0]?.reg) {
      await tx.$executeRaw`DELETE FROM "PendingSignature" WHERE "userId" = ${userId}`
    }
    for (const step of steps) {
      const where = whereSql(step.where, userId)
      if (step.action === "null") {
        await tx.$executeRaw`
          UPDATE ${quoteIdent(step.table)}
          SET ${quoteIdent(step.column)} = NULL
          WHERE ${where}
        `
      } else {
        await tx.$executeRaw`
          DELETE FROM ${quoteIdent(step.table)}
          WHERE ${where}
        `
      }
    }
    const deleted = await tx.$executeRaw`
      DELETE FROM "User" WHERE "id" = ${userId}
    `
    if (Number(deleted) !== 1) {
      throw new Error("Client introuvable")
    }
  })
}

export function clientDeleteErrorMessage(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
    const constraint =
      typeof error.meta?.constraint === "string"
        ? error.meta.constraint
        : typeof error.meta?.field_name === "string"
          ? error.meta.field_name
          : ""
    return constraint
      ? `Suppression impossible : des données liées bloquent encore le compte (${constraint}).`
      : "Suppression impossible : des données liées bloquent encore le compte."
  }
  if (error instanceof Error && error.message === "Client introuvable") {
    return "Client introuvable"
  }
  return "Erreur lors de la suppression"
}

export async function findClientByEmail(email: string): Promise<ClientAccountMatch | null> {
  const normalized = normalizeAccountEmail(email)
  if (!normalized) return null
  const user = await prisma.user.findFirst({
    where: { email: { equals: normalized, mode: "insensitive" } },
    select: { id: true, email: true, raisonSociale: true },
    orderBy: { createdAt: "asc" },
  })
  if (!user) return null
  return { ...user, matchedBy: "email" }
}

export async function findClientBySiret(siret: string | null | undefined): Promise<ClientAccountMatch | null> {
  const normalized = normalizeAccountSiret(siret)
  if (!normalized) return null
  try {
    const rows = await prisma.$queryRaw<Array<{ id: string; email: string; raisonSociale: string | null }>>`
      SELECT "id", "email", "raisonSociale"
      FROM "User"
      WHERE regexp_replace(coalesce("siret", ''), '\\D', '', 'g') = ${normalized}
      ORDER BY "createdAt" ASC
      LIMIT 1
    `
    const row = rows[0]
    if (!row) return null
    return { ...row, matchedBy: "siret" }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return null
    }
    throw error
  }
}

export async function findDuplicateClientAccount(params: {
  email?: string | null
  siret?: string | null
}): Promise<ClientAccountMatch | null> {
  if (params.email) {
    const byEmail = await findClientByEmail(params.email)
    if (byEmail) return byEmail
  }
  if (params.siret) return findClientBySiret(params.siret)
  return null
}

export function duplicateSiretAccountMessage(email: string): string {
  return `Un compte existe déjà pour ce SIRET (${email}). Aucun nouveau compte n'a été créé.`
}
