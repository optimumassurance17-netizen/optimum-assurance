export function ConditionsParticulieresNotes({ lines }: { lines: readonly string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1 text-xs text-[#171717] mt-3">
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  )
}
