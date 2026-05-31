import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

export function extractUniqueMatches(value: string, regex: RegExp): string[] {
  const out = new Set<string>()
  for (const match of value.matchAll(regex)) {
    const extracted = match[1]?.trim()
    if (extracted) out.add(normalizeWhitespace(extracted))
  }
  return [...out]
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function avg(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((acc, v) => acc + v, 0) / values.length
}
