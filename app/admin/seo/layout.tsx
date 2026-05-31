import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { Header } from "@/components/Header"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { cn } from "@/optimum-geo-intelligence/lib/utils"

const SEO_NAV = [
  { href: "/admin/seo/linkpilot", label: "LinkPilot" },
  { href: "/admin/seo/prospects", label: "Prospects" },
  { href: "/admin/seo/campaigns", label: "Campagnes" },
  { href: "/admin/seo/backlinks", label: "Backlinks" },
  { href: "/admin/seo/toxic-links", label: "Liens toxiques" },
]

export default async function AdminSeoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session || !isAdmin(session)) {
    redirect("/connexion")
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {SEO_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/admin"
            className="ml-auto rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            ← Admin contrats
          </Link>
        </div>
        {children}
      </div>
    </main>
  )
}
