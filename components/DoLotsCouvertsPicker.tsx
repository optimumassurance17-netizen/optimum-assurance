"use client"

import { estLotClosEtCouvert, lotsConnus, normaliserLotsCouverts } from "@/lib/do-options-lots"

export function DoLotsCouvertsPicker({
  lots,
  onChange,
  tone = "light",
}: {
  lots: string[]
  onChange: (lots: string[]) => void
  tone?: "light" | "dark"
}) {
  const selected = new Set(normaliserLotsCouverts(lots))
  const text = tone === "dark" ? "text-gray-200" : "text-black"
  const hint = tone === "dark" ? "text-gray-400" : "text-[#333333]"

  const toggle = (lot: string) => {
    const next = selected.has(lot)
      ? lots.filter((item) => item.toLocaleLowerCase("fr-FR") !== lot.toLocaleLowerCase("fr-FR"))
      : [...lots, lot]
    onChange(normaliserLotsCouverts(next))
  }

  return (
    <fieldset className="space-y-3">
      <legend className={`font-semibold ${text}`}>Lots couverts</legend>
      <p className={`text-sm ${hint}`}>
        Cochez chaque lot compris dans la garantie. L&apos;option clos et couvert ne retient que les lots de
        structure. La prime reste calculée sur le coût total de l&apos;opération.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {lotsConnus().map((lot) => (
          <label key={lot} className={`flex items-start gap-2 text-sm font-medium ${text}`}>
            <input
              type="checkbox"
              checked={selected.has(lot)}
              onChange={() => toggle(lot)}
              className="mt-0.5 h-4 w-4 rounded text-[#2563eb]"
            />
            <span>
              {lot}
              {estLotClosEtCouvert(lot) ? "" : " — second œuvre"}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
