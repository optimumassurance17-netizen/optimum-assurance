import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { SignDocumentClient } from "@/components/esign/SignDocumentClient"
import { resolveSignPreview } from "@/lib/esign/resolve-sign-preview"
import { signaturePageNotice } from "@/lib/esign/signature-page-notice"
import { QUOTE_EXPIRED_ERROR } from "@/lib/quote-validity"

function normalizeInternalNext(next: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(next) ? next[0] : next
  if (!raw || typeof raw !== "string") return undefined
  const t = raw.trim()
  if (!t.startsWith("/") || t.startsWith("//")) return undefined
  return t
}

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ next?: string | string[] }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Signer le document · ${id.slice(0, 8)}…`,
    robots: { index: false, follow: false },
  }
}

export default async function SignDocumentPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const sp = await searchParams
  const afterSignRedirect = normalizeInternalNext(sp.next)
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()

  const preview = await resolveSignPreview(id)
  if (preview.kind === "missing") notFound()
  if (preview.kind === "expired") {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Devis expiré</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">{QUOTE_EXPIRED_ERROR}</p>
        <p className="mt-6">
          <Link href="/devis" className="font-medium text-blue-700 underline">
            Demander un nouveau devis
          </Link>
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Signature électronique</h1>
        <p className="mt-2 text-sm text-slate-600">Consultez le document, signez et recevez le PDF signé.</p>
      </header>
      <SignDocumentClient
        documentId={preview.documentId}
        documentSignedUrl={`/api/sign/local-pdf/${preview.documentId}`}
        afterSignRedirect={afterSignRedirect}
        notice={signaturePageNotice(afterSignRedirect)}
      />
    </main>
  )
}
