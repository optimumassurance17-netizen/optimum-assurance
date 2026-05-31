import { z } from "zod"
import { OGI_AI_PROVIDERS } from "@/optimum-geo-intelligence/lib/constants"

export const competitorScanSchema = z.object({
  competitorId: z.string().uuid().optional(),
  domain: z.string().min(3).optional(),
  limit: z.number().int().min(1).max(80).default(20),
})

export const geoAnalyzeSchema = z.object({
  queryId: z.string().uuid().optional(),
  query: z.string().min(2).max(180).optional(),
  provider: z.enum(OGI_AI_PROVIDERS).optional(),
})

export const contentGenerateSchema = z.object({
  type: z.enum(["article", "faq", "guide", "metier", "local-city", "local-metier-city"]),
  keyword: z.string().min(3).max(180),
  city: z.string().min(2).max(100).optional(),
  profession: z.string().min(2).max(120).optional(),
  intent: z.string().min(3).max(400).default("transactionnel"),
  autoPublish: z.boolean().default(true),
})

export const optimizePageSchema = z.object({
  path: z.string().min(1).max(400),
  autoApply: z.boolean().default(true),
})

export const alertCreateSchema = z.object({
  category: z.string().min(2).max(80),
  title: z.string().min(3).max(200),
  message: z.string().min(5).max(2000),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  payload: z.record(z.string(), z.unknown()).optional(),
})

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export const dashboardFilterSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  provider: z.enum(OGI_AI_PROVIDERS).optional(),
})
