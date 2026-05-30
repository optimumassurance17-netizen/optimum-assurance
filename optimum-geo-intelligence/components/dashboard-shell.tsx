import Link from "next/link"
import { Header } from "@/components/Header"
import { cn } from "@/optimum-geo-intelligence/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/seo", label: "SEO" },
  { href: "/dashboard/geo", label: "GEO" },
  { href: "/dashboard/competitors", label: "Concurrents" },
  { href: "/dashboard/content", label: "Contenu" },
  { href: "/dashboard/alerts", label: "Alertes" },
  { href: "/dashboard/settings", label: "Settings" },
]

export function DashboardShell({
  pathname,
  children,
}: {
  pathname: string
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen bg-slate-50">
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                pathname === item.href
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
        {children}
      </div>
    </main>
  )
}
