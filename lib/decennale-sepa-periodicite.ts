import { periodiciteDecennale, type PeriodiciteCotisationDecennale } from "@/lib/premium"

/** Lecture au moment du PDF, sans importer Prisma au chargement du module. */
export async function periodiciteSepaDecennale(
  userId: string | null | undefined
): Promise<PeriodiciteCotisationDecennale> {
  if (!userId) return "mensuel"
  const { prisma } = await import("@/lib/prisma")
  const sub = await prisma.sepaSubscription.findUnique({
    where: { userId },
    select: { periodicite: true },
  })
  return sub ? periodiciteDecennale(sub.periodicite) : "mensuel"
}
