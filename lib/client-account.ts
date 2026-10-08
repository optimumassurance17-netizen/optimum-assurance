import { Prisma } from "@/lib/prisma-client"
import { prisma } from "@/lib/prisma"
import { purgeClientExternalResidue } from "@/lib/purge-client-residue"
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

const PROFILE_FIELDS = [
  "raisonSociale",
  "siret",
  "adresse",
  "codePostal",
  "ville",
  "telephone",
  "doInitialQuestionnaireJson",
  "doEtudeQuestionnaireJson",
  "titleInitialQuestionnaireJson",
  "titleEtudeQuestionnaireJson",
] as const

type ProfileField = (typeof PROFILE_FIELDS)[number]

type MergeUser = {
  id: string
  email: string
  raisonSociale: string | null
  siret: string | null
  adresse: string | null
  codePostal: string | null
  ville: string | null
  telephone: string | null
  doInitialQuestionnaireJson: string | null
  doEtudeQuestionnaireJson: string | null
  titleInitialQuestionnaireJson: string | null
  titleEtudeQuestionnaireJson: string | null
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim())
}

function isMissingColumn(error: unknown, names: string[]): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false
  if (error.code !== "P2021" && error.code !== "P2022") return false
  const message = error.message.toLowerCase()
  return names.some((name) => message.includes(name.toLowerCase()))
}

async function ignoreMissingTable(run: () => Promise<unknown>): Promise<void> {
  try {
    await run()
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return
    }
    throw error
  }
}

async function loadMergeUser(id: string): Promise<MergeUser | null> {
  const base = {
    id: true,
    email: true,
    raisonSociale: true,
    siret: true,
    adresse: true,
    codePostal: true,
    ville: true,
    telephone: true,
    doInitialQuestionnaireJson: true,
    doEtudeQuestionnaireJson: true,
  } as const
  try {
    return await prisma.user.findUnique({
      where: { id },
      select: {
        ...base,
        titleInitialQuestionnaireJson: true,
        titleEtudeQuestionnaireJson: true,
      },
    })
  } catch (error) {
    if (!isMissingColumn(error, ["titleinitialquestionnairejson", "titleetudequestionnairejson"])) throw error
    const user = await prisma.user.findUnique({ where: { id }, select: base })
    if (!user) return null
    return {
      ...user,
      titleInitialQuestionnaireJson: null,
      titleEtudeQuestionnaireJson: null,
    }
  }
}

async function moveDroppedAccount(keepId: string, dropId: string): Promise<void> {
  const keeper = await loadMergeUser(keepId)
  const dropped = await loadMergeUser(dropId)
  if (!keeper || !dropped) throw new Error("Client introuvable")

  const profile: Partial<Record<ProfileField, string>> = {}
  for (const field of PROFILE_FIELDS) {
    if (!hasText(keeper[field]) && hasText(dropped[field])) {
      profile[field] = dropped[field]!.trim()
    }
  }

  await prisma.$transaction(
    async (tx) => {
      if (Object.keys(profile).length > 0) {
        try {
          await tx.user.update({ where: { id: keepId }, data: profile })
        } catch (error) {
          if (!isMissingColumn(error, ["titleinitialquestionnairejson", "titleetudequestionnairejson"])) throw error
          const safe = { ...profile }
          delete safe.titleInitialQuestionnaireJson
          delete safe.titleEtudeQuestionnaireJson
          if (Object.keys(safe).length > 0) {
            await tx.user.update({ where: { id: keepId }, data: safe })
          }
        }
      }

      await tx.document.updateMany({ where: { userId: dropId }, data: { userId: keepId } })
      await tx.payment.updateMany({ where: { userId: dropId }, data: { userId: keepId } })
      await tx.avenantFee.updateMany({ where: { userId: dropId }, data: { userId: keepId } })
      await tx.clientNote.updateMany({ where: { userId: dropId }, data: { userId: keepId } })
      await tx.resiliationRequest.updateMany({ where: { userId: dropId }, data: { userId: keepId } })
      await tx.sinistre.updateMany({ where: { userId: dropId }, data: { userId: keepId } })
      await tx.passwordResetToken.deleteMany({ where: { userId: dropId } })

      await ignoreMissingTable(() =>
        tx.insuranceContract.updateMany({ where: { userId: dropId }, data: { userId: keepId } })
      )
      await ignoreMissingTable(() =>
        tx.devoirConseilLog.updateMany({ where: { userId: dropId }, data: { userId: keepId } })
      )
      await ignoreMissingTable(() =>
        tx.whatsappClickLog.updateMany({ where: { userId: dropId }, data: { userId: keepId } })
      )
      await ignoreMissingTable(() =>
        tx.pdfGenerationLog.updateMany({ where: { userId: dropId }, data: { userId: keepId } })
      )
      await ignoreMissingTable(() =>
        tx.pendingSignature.updateMany({ where: { userId: dropId }, data: { userId: keepId } })
      )

      const keeperDocs = await tx.userDocument.findMany({
        where: { userId: keepId },
        select: { type: true },
      })
      const types = new Set(keeperDocs.map((doc) => doc.type))
      const dropDocs = await tx.userDocument.findMany({
        where: { userId: dropId },
        select: { id: true, type: true },
      })
      for (const doc of dropDocs) {
        if (types.has(doc.type)) continue
        try {
          await tx.userDocument.update({ where: { id: doc.id }, data: { userId: keepId } })
          types.add(doc.type)
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue
          throw error
        }
      }

      const keeperInputs = await tx.missingSubActivity.findMany({
        where: { userId: keepId },
        select: { userInput: true },
      })
      const inputs = new Set(keeperInputs.map((row) => row.userInput))
      const dropInputs = await tx.missingSubActivity.findMany({
        where: { userId: dropId },
        select: { id: true, userInput: true },
      })
      for (const row of dropInputs) {
        if (inputs.has(row.userInput)) continue
        try {
          await tx.missingSubActivity.update({ where: { id: row.id }, data: { userId: keepId } })
          inputs.add(row.userInput)
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue
          throw error
        }
      }

      const keeperSepa = await tx.sepaSubscription.findUnique({
        where: { userId: keepId },
        select: { id: true },
      })
      if (!keeperSepa) {
        await tx.sepaSubscription.updateMany({ where: { userId: dropId }, data: { userId: keepId } })
      }
    },
    { timeout: 20000 }
  )

  const residueDocs = await prisma.userDocument.findMany({
    where: { userId: dropId },
    select: { filepath: true },
  })
  const residueSepa = await prisma.sepaSubscription.findUnique({
    where: { userId: dropId },
    select: { mollieCustomerId: true },
  })
  await deleteClientAccount(dropId)
  await purgeClientExternalResidue({
    gedFilepaths: residueDocs.map((row) => row.filepath),
    mollieCustomerId: residueSepa?.mollieCustomerId ?? null,
  })
}

/** Réunit les fiches doublons dans le compte conservé, puis supprime les autres. */
export async function mergeClientAccounts(keepId: string, dropIds: string[]): Promise<string[]> {
  const unique = [...new Set(dropIds)].filter((id) => id && id !== keepId)
  if (unique.length === 0) throw new Error("Aucune fiche à fusionner")
  const merged: string[] = []
  for (const dropId of unique) {
    try {
      await moveDroppedAccount(keepId, dropId)
      merged.push(dropId)
    } catch (error) {
      if (merged.length > 0) {
        const detail = error instanceof Error ? error.message : "erreur"
        throw new Error(`Fusion incomplète (${merged.length} fiche(s) déjà réunie(s)). ${detail}`)
      }
      throw error
    }
  }
  return merged
}
