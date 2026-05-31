import * as React from "react"
import { cn } from "@/optimum-geo-intelligence/lib/utils"

export function Badge({
  className,
  tone = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "default" | "success" | "warning" | "danger" | "info" }) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-100 text-emerald-800"
      : tone === "warning"
        ? "bg-amber-100 text-amber-900"
        : tone === "danger"
          ? "bg-red-100 text-red-900"
          : tone === "info"
            ? "bg-blue-100 text-blue-900"
            : "bg-slate-100 text-slate-800"
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", toneClass, className)}
      {...props}
    />
  )
}
