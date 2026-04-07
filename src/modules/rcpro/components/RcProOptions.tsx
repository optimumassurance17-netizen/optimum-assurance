"use client"

import type { RcProOptionInput } from "@/src/modules/rcpro/types/rcpro.types"

type RcProOptionsProps = {
  options: RcProOptionInput[]
  selected: RcProOptionInput[]
  onChange: (options: RcProOptionInput[]) => void
}

export const RC_PRO_AVAILABLE_OPTIONS: RcProOptionInput[] = [
  {
    code: "protection-juridique-renforcee",
    label: "Protection juridique renforcee (+20 EUR)",
    type: "fixed",
    value: 20,
  },
  {
    code: "cyber-assistance",
    label: "Cyber assistance (+35 EUR)",
    type: "fixed",
    value: 35,
  },
  {
    code: "defense-recours-plus",
    label: "Defense / recours Plus (+8%)",
    type: "percent",
    value: 8,
  },
]

export function RcProOptions({ options, selected, onChange }: RcProOptionsProps) {
  const selectedCodes = new Set(selected.map((o) => o.code))

  function toggleOption(option: RcProOptionInput) {
    if (selectedCodes.has(option.code)) {
      onChange(selected.filter((o) => o.code !== option.code))
      return
    }
    onChange([...selected, option])
  }

  return (
    <div className="space-y-3">
      {options.map((option) => (
        <label
          key={option.code}
          className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#d4d4d4] bg-white p-3"
        >
          <input
            type="checkbox"
            checked={selectedCodes.has(option.code)}
            onChange={() => toggleOption(option)}
            className="h-4 w-4 accent-[#2563eb]"
          />
          <span className="text-sm text-[#0a0a0a]">{option.label}</span>
        </label>
      ))}
    </div>
  )
}
