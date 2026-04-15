import { noindexMetadata } from "@/lib/seo-noindex"

export const metadata = noindexMetadata

export default function EspaceClientLayout({ children }: { children: React.ReactNode }) {
  return children
}
