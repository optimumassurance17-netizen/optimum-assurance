type Props = {
  title?: string
  amountLabel: string
  hint?: string
}

/**
 * Bloc prix / fourchette indicative (conversion + transparence).
 */
export function PriceBlock({ title = "Prix indicatif", amountLabel, hint }: Props) {
  return (
    <section
      className="mb-10 rounded-2xl border border-[#e5e5e5] border-l-4 border-l-blue-600 bg-white p-6 shadow-sm"
      aria-labelledby="price-block-title"
    >
      <h2 id="price-block-title" className="text-lg font-bold text-[#0a0a0a] mb-2">
        {title}
      </h2>
      <p className="text-2xl md:text-3xl font-bold text-blue-600 tabular-nums">{amountLabel}</p>
      {hint ? <p className="mt-3 text-sm text-[#525252] leading-relaxed">{hint}</p> : null}
    </section>
  )
}
