import {
  REPRISE_PASSE_CLIENT_ETAPES,
  REPRISE_PASSE_CLIENT_TITRE,
} from "@/lib/decennale-reprise-passe"

export function ReprisePasseExplication({ dateReprise }: { dateReprise?: string }) {
  return (
    <section className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-[#0a0a0a] print:hidden">
      <h2 className="text-lg font-semibold">{REPRISE_PASSE_CLIENT_TITRE}</h2>
      {dateReprise ? (
        <p className="mt-2 font-medium">Date de reprise du passé : {dateReprise}</p>
      ) : null}
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
        {REPRISE_PASSE_CLIENT_ETAPES.map((etape) => (
          <li key={etape}>{etape}</li>
        ))}
      </ol>
    </section>
  )
}
