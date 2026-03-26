"use client"

interface AvenantTemplateProps {
  numero: string
  data: {
    raisonSociale?: string
    siret?: string
    contractNumero?: string
    motifAvenant?: string
    dateAvenant?: string
    chiffreAffaires?: number
    primeAnnuelle?: number
    activites?: string[]
    [key: string]: unknown
  }
}

export function AvenantTemplate({ numero, data }: AvenantTemplateProps) {
  const modifications: string[] = []
  if (data.chiffreAffaires != null) modifications.push(`Chiffre d'affaires : ${data.chiffreAffaires.toLocaleString("fr-FR")} €`)
  if (data.primeAnnuelle != null) modifications.push(`Prime annuelle : ${data.primeAnnuelle.toLocaleString("fr-FR")} €`)
  if (data.activites?.length) modifications.push(`Activités : ${data.activites.join(", ")}`)

  return (
    <div className="bg-white p-8 max-w-[210mm] mx-auto font-sans text-black print:p-0">
      <div className="border-b-2 border-[#C65D3B] pb-4 mb-8">
        <h1 className="text-2xl font-bold text-[#C65D3B]">Optimum Assurance</h1>
        <p className="text-sm text-[#171717]">Assurance décennale professionnelle</p>
      </div>

      <h2 className="text-xl font-semibold mb-2 text-center">AVENANT</h2>
      <p className="text-center font-semibold mb-8 text-[#C65D3B]">Modification du contrat d&apos;assurance</p>

      <p className="text-center mb-8">N° {numero}</p>

      <div className="border-2 border-[#E5E0D8] p-6 rounded-xl mb-8">
        <p className="mb-4">
          Le présent avenant modifie le contrat N° <strong>{data.contractNumero || "—"}</strong>.
        </p>
        <p className="mb-2 font-semibold">{data.raisonSociale}</p>
        {data.siret && <p className="mb-4">SIRET : {data.siret}</p>}
        <p className="mb-4 text-sm text-[#171717]">Motif : {data.motifAvenant || "Modification contractuelle"}</p>
        <p className="mb-2 font-medium">Modifications apportées :</p>
        <ul className="list-disc list-inside space-y-1 mb-4">
          {modifications.length > 0 ? modifications.map((m, i) => <li key={i}>{m}</li>) : <li>Aucune modification détaillée</li>}
        </ul>
        <p className="text-sm">Date de l&apos;avenant : {data.dateAvenant || new Date().toLocaleDateString("fr-FR")}</p>
        <p className="text-sm font-medium mt-4 text-[#C65D3B]">
          Frais d&apos;avenant : 60 € (reportés automatiquement sur la prochaine échéance de prélèvement)
        </p>
      </div>

      <p className="text-sm">
        Fait à Paris, le {new Date().toLocaleDateString("fr-FR")}
      </p>
      <p className="text-sm mt-4">
        Pour Optimum Assurance
      </p>
      <p className="text-[10px] text-[#333333] mt-6 leading-tight">
        En application du 2° de l&apos;article 261 C du CGI, sont exonérées de la taxe sur la valeur ajoutée (TVA) les opérations d&apos;assurance, de réassurance ainsi que les prestations de services afférentes à ces opérations effectuées par les courtiers et intermédiaires d&apos;assurance.
      </p>
    </div>
  )
}
