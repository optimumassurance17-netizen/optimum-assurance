#!/usr/bin/env node
/**
 * Monitoring prod sans secrets.
 *
 * Objectif : détecter rapidement les régressions publiques (health, sitemaps,
 * pages critiques) et produire un rapport exploitable par un agent IA.
 */

const baseUrl = (process.env.PROD_WATCHDOG_URL || "https://www.optimum-assurance.fr").replace(/\/$/, "")

const checks = [
  {
    name: "health",
    path: "/api/health",
    contentType: /application\/json/i,
    validate: async ({ body }) => {
      const json = JSON.parse(body)
      if (json.status !== "ok") throw new Error(`health.status=${json.status}`)
      if (json.database !== "connected") throw new Error(`database=${json.database}`)
      if (json.email?.resend !== "configured") throw new Error("RESEND_API_KEY manquant")
      if (json.email?.from !== "configured") throw new Error("EMAIL_FROM manquant")
      if (json.crons?.secret !== "configured") throw new Error("CRON_SECRET manquant")
      if (json.esign?.ready !== true) throw new Error("esign.ready=false")
      if (json.sirene?.insee !== "configured") throw new Error("sirene.insee manquant")
    },
  },
  {
    name: "robots",
    path: "/robots.txt",
    contentType: /text\/plain/i,
    mustContain: ["Sitemap: https://www.optimum-assurance.fr/sitemap.xml"],
  },
  {
    name: "gsc-sitemap",
    path: "/gsc-sitemap.xml",
    contentType: /application\/xml|text\/xml/i,
    mustContain: ["<sitemapindex", "sitemap-static.xml", "sitemap-programmatic.xml"],
  },
  {
    name: "static-sitemap",
    path: "/sitemap-static.xml",
    contentType: /application\/xml|text\/xml/i,
    minLocCount: 100,
    mustContain: ["/a-propos", "/comparatifs/decennale-vs-rc-pro"],
  },
  {
    name: "programmatic-sitemap",
    path: "/sitemap-programmatic.xml",
    contentType: /application\/xml|text\/xml/i,
    minLocCount: 1000,
    mustContain: ["/assurance-decennale/plombier/paris", "/dommage-ouvrage/auto-construction/paris"],
  },
  {
    name: "home",
    path: "/",
    contentType: /text\/html/i,
    mustContain: ["Votre assurance décennale", "Dommage Ouvrage"],
  },
  {
    name: "client-space",
    path: "/espace-client",
    contentType: /text\/html/i,
    mustContain: ["Espace client"],
  },
  {
    name: "ai-llms",
    path: "/llms.txt",
    contentType: /text\/plain/i,
    mustContain: ["Pages sources prioritaires", "comparatifs/decennale-vs-rc-pro"],
  },
  {
    name: "ai-about",
    path: "/a-propos",
    contentType: /text\/html/i,
    mustContain: ["À propos", "ORIAS", "Accelerant"],
  },
]

function countLoc(body) {
  return (body.match(/<loc>/g) || []).length
}

async function runCheck(check) {
  const url = `${baseUrl}${check.path}`
  const started = Date.now()
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Optimum-Assurance-Prod-Watchdog/1.0",
      "Cache-Control": "no-cache",
    },
    redirect: "follow",
  })
  const body = await res.text()
  const ms = Date.now() - started
  const contentType = res.headers.get("content-type") || ""

  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`)
  if (check.contentType && !check.contentType.test(contentType)) {
    throw new Error(`${url} -> content-type inattendu: ${contentType}`)
  }
  if (check.mustContain) {
    for (const needle of check.mustContain) {
      if (!body.includes(needle)) throw new Error(`${url} -> contenu manquant: ${needle}`)
    }
  }
  if (check.minLocCount != null) {
    const locCount = countLoc(body)
    if (locCount < check.minLocCount) {
      throw new Error(`${url} -> ${locCount} <loc>, attendu >= ${check.minLocCount}`)
    }
  }
  if (check.validate) await check.validate({ body, res })

  return { name: check.name, url, status: res.status, contentType, ms, ok: true }
}

const results = []
const failures = []

for (const check of checks) {
  try {
    const result = await runCheck(check)
    results.push(result)
    console.log(`✅ ${result.name} ${result.status} ${result.ms}ms ${result.url}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    failures.push({ name: check.name, path: check.path, message })
    console.log(`❌ ${check.name} ${message}`)
  }
}

const report = {
  baseUrl,
  checkedAt: new Date().toISOString(),
  ok: failures.length === 0,
  results,
  failures,
  aiRepairPrompt:
    failures.length === 0
      ? null
      : [
          "Contexte: monitoring production Optimum Assurance en échec.",
          "Objectif: analyser les erreurs ci-dessous, corriger sur une branche dédiée, lancer lint/typecheck/build/e2e, créer une PR. Ne pas modifier paiements, auth, contrats, PDF juridiques ou migrations sans justification explicite.",
          `Échecs: ${JSON.stringify(failures, null, 2)}`,
        ].join("\n\n"),
}

console.log("\n--- PROD_WATCHDOG_REPORT_START ---")
console.log(JSON.stringify(report, null, 2))
console.log("--- PROD_WATCHDOG_REPORT_END ---\n")

if (!report.ok) process.exit(1)
