"use client"

import Link from "next/link"

export type BreadcrumbItem = { label: string; href?: string }

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="text-sm mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-[#171717]">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-[#333333]">/</span>}
            {item.href ? (
              <Link href={item.href} className="text-[#2563eb] hover:underline font-medium">
                {item.label}
              </Link>
            ) : (
              <span className="text-[#0a0a0a] font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
