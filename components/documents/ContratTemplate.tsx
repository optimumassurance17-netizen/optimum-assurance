"use client"

interface ContratTemplateProps {
  numero: string
  data: {
    raisonSociale: string
    siret: string
    adresse?: string
    codePostal?: string
    ville?: string
    email: string
    representantLegal?: string
    civilite?: string
    activites: string[]
    chiffreAffaires: number
    primeAnnuelle: number
    primeMensuelle?: number
    primeTrimestrielle?: number
    modePaiement?: "unique" | "prelevement"
    periodicitePrelevement?: "mensuel" | "trimestriel"
    fraisGestionPrelevement?: number
    franchise: number
    plafond: number
    dateEffet: string
    dateEcheance: string
  }
}

export function ContratTemplate({ numero, data }: ContratTemplateProps) {
  return (
    <div className="bg-white p-8 max-w-[210mm] mx-auto font-sans text-black print:p-0">
      <div className="border-b-2 border-[#C65D3B] pb-4 mb-6">
        <h1 className="text-2xl font-bold text-[#C65D3B]">Optimum Assurance</h1>
        <p className="text-sm text-[#171717]">Assurance décennale professionnelle</p>
      </div>

      <h2 className="text-xl font-semibold mb-6">CONTRAT D&apos;ASSURANCE DÉCENNALE</h2>
      <p className="font-semibold mb-6">N° {numero}</p>

      <div className="space-y-6 text-sm">
        <section>
          <h3 className="font-semibold mb-2">Article 1 - Parties</h3>
          <p><strong>L&apos;Assureur :</strong> Optimum Assurance</p>
          <p className="mt-2"><strong>L&apos;Assuré :</strong> {data.raisonSociale}</p>
          <p>SIRET : {data.siret}</p>
          {data.adresse && <p>{data.adresse}</p>}
          {(data.codePostal || data.ville) && <p>{data.codePostal} {data.ville}</p>}
          <p>Représenté par : {data.civilite || ""} {data.representantLegal || "—"}</p>
        </section>

        <section>
          <h3 className="font-semibold mb-2">Article 2 - Objet</h3>
          <p>Le présent contrat garantit la responsabilité civile décennale de l&apos;assuré pour les activités suivantes : {data.activites.join(", ")}.</p>
        </section>

        <section>
          <h3 className="font-semibold mb-2">Article 3 - Période de garantie</h3>
          <p>Du {data.dateEffet} au {data.dateEcheance}</p>
        </section>

        <section>
          <h3 className="font-semibold mb-2">Article 4 - Conditions financières</h3>
          <table className="w-full border-collapse">
            <tbody>
              <tr className="border-b">
                <td className="py-2">Prime annuelle</td>
                <td className="text-right">{(data.primeAnnuelle ?? 0).toLocaleString("fr-FR")} € TTC</td>
              </tr>
              {data.modePaiement === "prelevement" && (
                <>
                  <tr className="border-b">
                    <td className="py-2">Mode de paiement</td>
                    <td className="text-right">Prélèvement {data.periodicitePrelevement === "mensuel" ? "mensuel" : "trimestriel"}</td>
                  </tr>
                  {data.fraisGestionPrelevement != null && (
                    <tr className="border-b">
                      <td className="py-2">Frais de gestion (1er prélèvement)</td>
                      <td className="text-right">{data.fraisGestionPrelevement} €</td>
                    </tr>
                  )}
                  {(data.primeMensuelle != null || data.primeTrimestrielle != null) && (
                    <tr className="border-b">
                      <td className="py-2">Montant par échéance</td>
                      <td className="text-right">
                        {(data.primeMensuelle ?? data.primeTrimestrielle ?? 0).toLocaleString("fr-FR")} €
                      </td>
                    </tr>
                  )}
                </>
              )}
              <tr className="border-b">
                <td className="py-2">Franchise</td>
                <td className="text-right">{(data.franchise ?? 0).toLocaleString("fr-FR")} €</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">Plafond de garantie</td>
                <td className="text-right">{(data.plafond ?? 0).toLocaleString("fr-FR")} €</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h3 className="font-semibold mb-2">Article 5 - Déclaration</h3>
          <p>Chiffre d&apos;affaires annuel déclaré : {data.chiffreAffaires.toLocaleString("fr-FR")} €</p>
        </section>

        <section>
          <h3 className="font-semibold mb-2">Article 6 - Résiliation</h3>
          <p>Les demandes de résiliation doivent être adressées par lettre recommandée au plus tard 2 mois avant la date d&apos;échéance (31 décembre). Un minimum d&apos;un an de contrat est requis avant toute résiliation à l&apos;échéance.</p>
        </section>

        <p className="text-xs text-[#171717] mt-8">
          Les conditions générales du contrat sont annexées et font partie intégrante du présent contrat.
        </p>
        <p className="text-[10px] text-[#737373] mt-4 leading-tight">
          En application du 2° de l&apos;article 261 C du CGI, sont exonérées de la taxe sur la valeur ajoutée (TVA) les opérations d&apos;assurance, de réassurance ainsi que les prestations de services afférentes à ces opérations effectuées par les courtiers et intermédiaires d&apos;assurance.
        </p>
      </div>
    </div>
  )
}
