import { sitemapIndexResponse } from "@/lib/sitemap/index-response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  return sitemapIndexResponse()
}
