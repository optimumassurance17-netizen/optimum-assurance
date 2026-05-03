import type { Metadata } from "next"
import { noindexMetadata } from "@/lib/seo-noindex"

export const metadata: Metadata = noindexMetadata

export default function DevisResumeLayout({ children }: { children: React.ReactNode }) {
  return children
}
