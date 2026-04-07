#!/usr/bin/env node
/**
 * Vérifie la prod accessible publiquement (sans secrets).
 * Usage: npm run verify:prod
 *        node scripts/verify-prod-remote.mjs https://www.optimum-assurance.fr
 */
const base = (process.argv[2] || process.env.VERIFY_PROD_URL || "https://www.optimum-assurance.fr").replace(
  /\/$/,
  ""
)

const paths = ["/api/health", "/robots.txt", "/sitemap.xml"]

async function check(pathname) {
  const url = base + pathname
  try {
    const res = await fetch(url, { redirect: "follow" })
    const ok = res.ok
    console.log(ok ? "✅" : "❌", res.status, url)
    if (pathname === "/api/health" && ok) {
      const j = await res.json().catch(() => ({}))
      console.log("   ", JSON.stringify(j))
      if (j.crons?.secret === "missing") {
        console.log("   ⚠️  crons.secret = missing → les routes /api/cron/* renverront 503 en prod (définir CRON_SECRET sur Vercel).")
      }
      if (j.esign && j.esign.ready === false) {
        console.log(
          "   ⚠️  esign.ready = false → signature électronique indisponible (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY sur Vercel)."
        )
      }
    }
    return ok
  } catch (e) {
    console.log("❌ erreur", url, e.message)
    return false
  }
}

console.log("\n🔍 Vérification prod —", base, "\n")
let all = true
for (const p of paths) {
  const ok = await check(p)
  if (!ok) all = false
}
console.log(all ? "\n✅ Terminé.\n" : "\n⚠️ Au moins une URL a échoué.\n")
process.exit(all ? 0 : 1)
