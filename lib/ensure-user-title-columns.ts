import { prisma } from "@/lib/prisma"

const TITLE_COLUMNS = ["titleInitialQuestionnaireJson", "titleEtudeQuestionnaireJson"] as const

export type TitleQuestionnaireColumnsStatus = "ok" | "added" | "failed"

let ensured = false

/**
 * Ajoute les colonnes du questionnaire assurance titre si la migration Prisma
 * n'a pas encore été appliquée. Lecture du catalogue d'abord : l'ALTER n'est
 * lancé que lorsqu'une colonne manque.
 */
export async function ensureUserTitleQuestionnaireColumns(): Promise<TitleQuestionnaireColumnsStatus> {
  if (ensured) return "ok"
  try {
    const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'User'
        AND column_name IN ('titleInitialQuestionnaireJson', 'titleEtudeQuestionnaireJson')
    `
    const present = new Set(rows.map((row) => row.column_name))
    const missing = TITLE_COLUMNS.filter((name) => !present.has(name))
    if (missing.length === 0) {
      ensured = true
      return "ok"
    }
    if (!present.has("titleInitialQuestionnaireJson")) {
      await prisma.$executeRaw`
        ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "titleInitialQuestionnaireJson" TEXT
      `
    }
    if (!present.has("titleEtudeQuestionnaireJson")) {
      await prisma.$executeRaw`
        ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "titleEtudeQuestionnaireJson" TEXT
      `
    }
    ensured = true
    return "added"
  } catch (error) {
    console.error("[ensure-user-title-columns]", error)
    return "failed"
  }
}
