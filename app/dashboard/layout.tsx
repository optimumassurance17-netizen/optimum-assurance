import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { OgiQueryProvider } from "@/optimum-geo-intelligence/client/query-client"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session || !isAdmin(session)) {
    redirect("/connexion")
  }

  return <OgiQueryProvider>{children}</OgiQueryProvider>
}
