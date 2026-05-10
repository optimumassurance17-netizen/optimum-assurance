type ComparisonRow = {
  sujet: string
  left: string
  right: string
}

type Props = {
  leftTitle: string
  rightTitle: string
  rows: ComparisonRow[]
}

export function ComparisonTable({ leftTitle, rightTitle, rows }: Props) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#e5e5e5] bg-white">
      <table className="w-full min-w-[680px] border-collapse text-left text-sm">
        <thead className="bg-[#eff6ff] text-[#0a0a0a]">
          <tr>
            <th className="border-b border-[#dbeafe] px-4 py-3 font-bold">Sujet</th>
            <th className="border-b border-[#dbeafe] px-4 py-3 font-bold">{leftTitle}</th>
            <th className="border-b border-[#dbeafe] px-4 py-3 font-bold">{rightTitle}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.sujet} className="border-b border-[#f0f0f0] last:border-0">
              <th className="px-4 py-3 font-semibold text-[#0a0a0a]">{row.sujet}</th>
              <td className="px-4 py-3 text-[#171717]">{row.left}</td>
              <td className="px-4 py-3 text-[#171717]">{row.right}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
