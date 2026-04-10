import type { Metadata } from "next"
import { SITE_URL } from "@/lib/site-url"

const baseUrl = SITE_URL

export const metadata: Metadata = {
  title: "Signature",
  alternates: {
    canonical: `${baseUrl}/signature`,
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function SignatureLayout({ children }: { children: React.ReactNode }) {
  return children
}
