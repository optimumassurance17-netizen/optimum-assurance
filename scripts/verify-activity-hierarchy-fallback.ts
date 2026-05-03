import { isActivityHierarchySchemaError } from "@/lib/activity-hierarchy-errors"

const prodError = new Error(
  "Invalid `prisma.activityGroup.upsert()` invocation: The table `public.ActivityGroup` does not exist in the current database."
)

if (!isActivityHierarchySchemaError(prodError)) {
  throw new Error("Le fallback nomenclature ne reconnait pas l'erreur ActivityGroup absente.")
}

const prismaError = {
  code: "P2021",
  message: "The table `public.SubActivity` does not exist in the current database.",
}

if (!isActivityHierarchySchemaError(prismaError)) {
  throw new Error("Le fallback nomenclature ne reconnait pas l'erreur Prisma P2021.")
}

console.log("OK: fallback nomenclature actif si les tables ActivityGroup/SubActivity sont absentes.")
