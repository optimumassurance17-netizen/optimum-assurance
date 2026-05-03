import type { Metadata } from "next"
import { noindexMetadata } from "@/lib/seo-noindex"

export const metadata: Metadata = noindexMetadata

export default function SouscriptionLayout({ children }: { children: React.ReactNode }) {
  return children
}
