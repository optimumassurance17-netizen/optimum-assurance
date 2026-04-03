import Link from "next/link"
import type { InternalLink } from "@/lib/seo-programmatic/types"

type Props = {
  title: string
  links: InternalLink[]
}

export function InternalLinkSection({ title, links }: Props) {
  if (!links.length) return null

  return (
    <nav className="mt-10 rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-6" aria-label={title}>
      <h2 className="text-lg font-bold text-[#0a0a0a] mb-4">{title}</h2>
      <ul className="flex flex-wrap gap-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="inline-block rounded-lg bg-white border border-[#e5e5e5] px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 hover:border-blue-200 transition-colors"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
