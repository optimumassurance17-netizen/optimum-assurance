"use client"

import { cn } from "@/optimum-geo-intelligence/lib/utils"

type Status =
  | "new"
  | "qualified"
  | "contacted"
  | "replied"
  | "accepted"
  | "rejected"
  | "acquired"
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "lost"
  | "pending"
  | "ready_for_review"
  | "approved"
  | "failed"
  | "sent"
  | "open"
  | "acknowledged"
  | "resolved"

const STATUS_TONE: Record<Status, string> = {
  new: "bg-slate-100 text-slate-800",
  qualified: "bg-blue-100 text-blue-800",
  contacted: "bg-indigo-100 text-indigo-800",
  replied: "bg-violet-100 text-violet-800",
  accepted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  acquired: "bg-emerald-200 text-emerald-900",
  draft: "bg-slate-100 text-slate-800",
  active: "bg-emerald-100 text-emerald-800",
  paused: "bg-amber-100 text-amber-900",
  completed: "bg-blue-100 text-blue-800",
  lost: "bg-red-100 text-red-800",
  pending: "bg-amber-100 text-amber-900",
  ready_for_review: "bg-indigo-100 text-indigo-800",
  approved: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
  sent: "bg-blue-100 text-blue-800",
  open: "bg-amber-100 text-amber-900",
  acknowledged: "bg-blue-100 text-blue-800",
  resolved: "bg-emerald-100 text-emerald-800",
}

export function StatusBadge({ status }: { status: string }) {
  const key = status as Status
  const tone = STATUS_TONE[key] ?? "bg-slate-100 text-slate-800"
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", tone)}>
      {status}
    </span>
  )
}
