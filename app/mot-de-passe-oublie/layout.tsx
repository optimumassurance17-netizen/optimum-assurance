import { noindexMetadata } from "@/lib/seo-noindex"

export const metadata = noindexMetadata

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
