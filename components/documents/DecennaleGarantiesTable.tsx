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
          <th className="border border-[#e5e5e5] p-3 text-left text-base font-bold">Garanties</th>
          <th className="border border-[#e5e5e5] p-3 text-left text-base font-bold">Description</th>
          <th className="border border-[#e5e5e5] p-3 text-right text-base font-bold">Plafond</th>
          <th className="border border-[#e5e5e5] p-3 text-right text-base font-bold">Franchise</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.nom}>
            <td className="border border-[#e5e5e5] p-3 text-lg font-bold text-black">{row.nom}</td>
            <td className="border border-[#e5e5e5] p-3 text-sm text-[#171717]">{row.description}</td>
            <td className="border border-[#e5e5e5] p-3 text-right text-lg font-bold text-black">{row.plafond}</td>
            <td className="border border-[#e5e5e5] p-3 text-right text-lg font-bold text-black">{row.franchise}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
