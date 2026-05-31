import { DashboardOverview } from "@/optimum-geo-intelligence/components/dashboard-overview"
import { DashboardShell } from "@/optimum-geo-intelligence/components/dashboard-shell"

export const dynamic = "force-dynamic"

export default function DashboardPage() {
  return (
    <DashboardShell pathname="/dashboard">
      <DashboardOverview />
    </DashboardShell>
  )
}
