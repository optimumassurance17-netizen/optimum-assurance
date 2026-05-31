"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { assertAdminSession } from "@/optimum-geo-intelligence/server/auth"
import { runAlertCenter } from "@/optimum-geo-intelligence/services/alerts"
import { runCompetitorTracker } from "@/optimum-geo-intelligence/services/competitor-tracker"
import { generateSeoContent } from "@/optimum-geo-intelligence/services/content-generator"
import { runGeoPageBuilder } from "@/optimum-geo-intelligence/services/geo-page-builder"
import { computeGlobalGeoScore, computeScopedGeoScores } from "@/optimum-geo-intelligence/services/geo-score"
import { runGeoVisibilityAnalysis } from "@/optimum-geo-intelligence/services/geo-visibility"
import { scanAndScoreSeoPages } from "@/optimum-geo-intelligence/services/seo-optimizer"

const generateLocalPagesSchema = z.object({
  maxCities: z.coerce.number().int().min(1).max(20).default(3),
  maxProfessions: z.coerce.number().int().min(1).max(20).default(4),
})

const generateContentSchema = z.object({
  type: z.enum(["article", "faq", "guide", "metier", "local-city", "local-metier-city"]),
  keyword: z.string().min(3),
  city: z.string().optional(),
  profession: z.string().optional(),
  intent: z.string().min(3).default("transactionnel"),
  autoPublish: z
    .string()
    .optional()
    .transform((value) => value === "on"),
})

export async function runCompetitorScanAction() {
  await assertAdminSession()
  await runCompetitorTracker()
  revalidatePath("/dashboard")
}

export async function runGeoAnalysisAction() {
  await assertAdminSession()
  await runGeoVisibilityAnalysis()
  revalidatePath("/dashboard")
}

export async function runSeoOptimizerAction() {
  await assertAdminSession()
  await scanAndScoreSeoPages({ autoApply: true, autoPublishGenerated: true })
  revalidatePath("/dashboard")
}

export async function runAlertsAction() {
  await assertAdminSession()
  await runAlertCenter()
  revalidatePath("/dashboard")
}

export async function generateLocalPagesAction(formData: FormData) {
  await assertAdminSession()
  const parsed = generateLocalPagesSchema.parse({
    maxCities: formData.get("maxCities"),
    maxProfessions: formData.get("maxProfessions"),
  })
  await runGeoPageBuilder({ ...parsed, autoPublish: true })
  revalidatePath("/dashboard/content")
}

export async function generateContentAction(formData: FormData) {
  await assertAdminSession()
  const parsed = generateContentSchema.parse({
    type: formData.get("type"),
    keyword: formData.get("keyword"),
    city: formData.get("city") || undefined,
    profession: formData.get("profession") || undefined,
    intent: formData.get("intent"),
    autoPublish: formData.get("autoPublish") || undefined,
  })
  await generateSeoContent(parsed)
  revalidatePath("/dashboard/content")
}

export async function recomputeGeoScoresAction() {
  await assertAdminSession()
  await Promise.all([computeGlobalGeoScore(), computeScopedGeoScores()])
  revalidatePath("/dashboard")
}
