import { decennaleGarantieRows } from "@/lib/decennale-garanties-affichage"

export function DecennaleGarantiesTable({
  data,
}: {
  data: { franchise?: unknown; plafond?: unknown; chiffreAffaires?: unknown }
}) {
  const rows = decennaleGarantieRows(data)
  return (
    <table className="w-full border-collapse border border-[#e5e5e5]">
      <thead>
        <tr className="bg-[#dbeafe]">
          <th className="border border-[#e5e5e5] p-2 text-left text-xs">Garanties</th>
          <th className="border border-[#e5e5e5] p-2 text-left text-xs">Description</th>
          <th className="border border-[#e5e5e5] p-2 text-right text-xs">Plafond</th>
          <th className="border border-[#e5e5e5] p-2 text-right text-xs">Franchise</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.nom}>
            <td className="border border-[#e5e5e5] p-2 text-xs font-medium">{row.nom}</td>
            <td className="border border-[#e5e5e5] p-2 text-xs text-[#171717]">{row.description}</td>
            <td className="border border-[#e5e5e5] p-2 text-right text-xs font-medium">{row.plafond}</td>
            <td className="border border-[#e5e5e5] p-2 text-right text-xs">{row.franchise}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
