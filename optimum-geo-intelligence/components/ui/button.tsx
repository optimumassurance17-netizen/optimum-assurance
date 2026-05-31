import * as React from "react"
import { cn } from "@/optimum-geo-intelligence/lib/utils"

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "danger"
}

export function Button({ className, variant = "default", ...props }: ButtonProps) {
  const variantClass =
    variant === "default"
      ? "bg-blue-600 text-white hover:bg-blue-700"
      : variant === "secondary"
        ? "bg-slate-900 text-white hover:bg-slate-800"
        : variant === "danger"
          ? "bg-red-600 text-white hover:bg-red-700"
          : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50"

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variantClass,
        className
      )}
      {...props}
    />
  )
}
