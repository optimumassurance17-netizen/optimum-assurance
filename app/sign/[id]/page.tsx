import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { SignDocumentClient } from "@/components/esign/SignDocumentClient"
import { resolveSignPreview } from "@/lib/esign/resolve-sign-preview"

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

  if (preview.kind === "unconfigured") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-slate-700">
          Configuration Supabase incomplète (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).
        </p>
        <Link href="/" className="mt-4 inline-block text-blue-600 underline">
          Accueil
        </Link>
      </main>
    )
  }

  if (preview.kind === "unavailable") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-bold text-slate-900">Document indisponible</h1>
        <p className="mt-2 text-slate-600">
          Le service de signature est momentanément indisponible. Rouvrez le lien dans quelques instants.
        </p>
        <Link href="/" className="mt-6 inline-block text-blue-600 underline">
          Accueil
        </Link>
      </main>
    )
  }

  const localFallback = preview.kind === "local"
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Signature électronique</h1>
        <p className="mt-2 text-sm text-slate-600">Consultez le document, signez et recevez le PDF signé.</p>
      </header>
      <SignDocumentClient
        documentId={preview.documentId}
        documentSignedUrl={
          preview.kind === "local" ? `/api/sign/local-pdf/${preview.documentId}` : preview.url
        }
        afterSignRedirect={afterSignRedirect}
        notice={
          localFallback
            ? "Vous signez directement auprès d’Optimum Assurance. Après validation, le parcours continue vers le mandat SEPA."
            : undefined
        }
      />
    </main>
  )
}
