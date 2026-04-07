"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  DO_ETUDE_DOCUMENTS_APRES,
  DO_ETUDE_DOCUMENTS_AVANT,
  DO_ETUDE_VERSION,
  emptyDoEtudeQuestionnaire,
  type DoEtudeQuestionnaireV1,
  type OuiNon,
} from "@/lib/do-etude-questionnaire-types"
import { inputFieldBg, inputTextDark } from "@/lib/form-input-styles"
import { readResponseJson } from "@/lib/read-response-json"

const inputClass = `w-full rounded-xl px-4 py-3 font-medium ${inputFieldBg} ${inputTextDark}`
const labelClass = "block mb-1.5 text-sm font-semibold text-[#0a0a0a]"
const sectionClass = "mb-10 p-6 bg-white border border-[#e5e5e5] rounded-2xl shadow-sm"
const h2Class = "text-lg font-bold text-[#0a0a0a] mb-4 pb-2 border-b border-[#e5e5e5]"

const DOC_AVANT_LABELS: Record<(typeof DO_ETUDE_DOCUMENTS_AVANT)[number], string> = {
  permis: "Permis de construire",
  plans: "Plans",
  devis: "Devis",
  planning: "Planning",
  etude_sol: "Étude de sol",
  attestations_decennales: "Attestations décennales",
}
const DOC_APRES_LABELS: Record<(typeof DO_ETUDE_DOCUMENTS_APRES)[number], string> = {
  pv_reception: "PV réception",
  rapport_ct: "Rapport contrôle technique",
}

function OuiNonRadios({
  name,
  value,
  onChange,
}: {
  name: string
  value: OuiNon
  onChange: (v: OuiNon) => void
}) {
  return (
    <div className="flex flex-wrap gap-4 mt-1">
      {(["oui", "non"] as const).map((v) => (
        <label key={v} className="inline-flex items-center gap-2 text-sm text-[#171717] cursor-pointer">
          <input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} className="accent-[#2563eb]" />
          {v === "oui" ? "Oui" : "Non"}
        </label>
      ))}
    </div>
  )
}

export function FormulaireDoEtudeEspaceClient() {
  const [form, setForm] = useState<DoEtudeQuestionnaireV1>(() => emptyDoEtudeQuestionnaire())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/client/do-questionnaire")
        const j = await readResponseJson<{
          error?: string
          form?: DoEtudeQuestionnaireV1
          hasInitial?: boolean
        }>(res)
        if (!res.ok) throw new Error(j.error || "Chargement impossible")
        if (!j.hasInitial) {
          setLoadError(
            "Aucune première demande de devis dommage ouvrage n’est associée à votre compte. Commencez par le devis en ligne, ou contactez-nous."
          )
          setLoading(false)
          return
        }
        if (j.form && !cancelled) setForm(j.form)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Erreur")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const setSous = useCallback((p: Partial<DoEtudeQuestionnaireV1["souscripteur"]>) => {
    setForm((f) => ({ ...f, souscripteur: { ...f.souscripteur, ...p } }))
  }, [])
  const setOp = useCallback((p: Partial<DoEtudeQuestionnaireV1["operation"]>) => {
    setForm((f) => ({ ...f, operation: { ...f.operation, ...p } }))
  }, [])
  const setTp = useCallback((p: Partial<DoEtudeQuestionnaireV1["typeProjet"]>) => {
    setForm((f) => ({ ...f, typeProjet: { ...f.typeProjet, ...p } }))
  }, [])
  const setCout = useCallback((p: Partial<DoEtudeQuestionnaireV1["cout"]>) => {
    setForm((f) => ({ ...f, cout: { ...f.cout, ...p } }))
  }, [])
  const setTech = useCallback((p: Partial<DoEtudeQuestionnaireV1["tech"]>) => {
    setForm((f) => ({ ...f, tech: { ...f.tech, ...p } }))
  }, [])
  const setEnv = useCallback((p: Partial<DoEtudeQuestionnaireV1["environnement"]>) => {
    setForm((f) => ({ ...f, environnement: { ...f.environnement, ...p } }))
  }, [])
  const setTs = useCallback((p: Partial<DoEtudeQuestionnaireV1["travauxSpecifiques"]>) => {
    setForm((f) => ({ ...f, travauxSpecifiques: { ...f.travauxSpecifiques, ...p } }))
  }, [])
  const setIv = useCallback((p: Partial<DoEtudeQuestionnaireV1["intervenants"]>) => {
    setForm((f) => ({ ...f, intervenants: { ...f.intervenants, ...p } }))
  }, [])
  const toggleDoc = useCallback((kind: "avant" | "apres", id: string) => {
    setForm((f) => {
      const arr = f.documents[kind]
      const next = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]
      return { ...f, documents: { ...f.documents, [kind]: next } }
    })
  }, [])

  const addLot = useCallback(() => {
    setForm((f) => ({
      ...f,
      lots: [...f.lots, { lot: "", entreprise: "", assureur: "", police: "", siren: "", montant: "" }],
    }))
  }, [])
  const setLot = useCallback((i: number, field: keyof DoEtudeQuestionnaireV1["lots"][0], val: string) => {
    setForm((f) => {
      const lots = [...f.lots]
      lots[i] = { ...lots[i], [field]: val }
      return { ...f, lots }
    })
  }, [])
  const removeLot = useCallback((i: number) => {
    setForm((f) => {
      const next = f.lots.filter((_, j) => j !== i)
      return {
        ...f,
        lots: next.length ? next : [{ lot: "", entreprise: "", assureur: "", police: "", siren: "", montant: "" }],
      }
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveMsg(null)
    try {
      const payload = { ...form, version: DO_ETUDE_VERSION }
      const res = await fetch("/api/client/do-questionnaire", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form: payload }),
      })
      const j = await readResponseJson<{ error?: string }>(res)
      if (!res.ok) throw new Error(j.error || "Enregistrement impossible")
      setSaveMsg({ type: "ok", text: "Questionnaire enregistré. Notre équipe pourra poursuivre l’étude de votre dossier." })
    } catch (err) {
      setSaveMsg({ type: "err", text: err instanceof Error ? err.message : "Erreur" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-[#171717] py-8">Chargement du questionnaire…</p>
  }
  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900">
        <p className="mb-3">{loadError}</p>
        <Link href="/devis-dommage-ouvrage" className="font-semibold text-[#2563eb] hover:underline">
          Aller au devis dommage ouvrage
        </Link>
      </div>
    )
  }

  const s = form.souscripteur
  const o = form.operation
  const tp = form.typeProjet
  const c = form.cout
  const t = form.tech
  const env = form.environnement
  const ts = form.travauxSpecifiques
  const g = form.garanties
  const iv = form.intervenants
  const v = form.validation

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <p className="text-sm text-[#525252] mb-6">
        Les champs issus de votre première demande sont préremplis. Complétez les sections pour l&apos;étude du risque.
      </p>

      <section className={sectionClass}>
        <h2 className={h2Class}>1. Informations souscripteur</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Nom / Raison sociale</label>
            <input className={inputClass} value={s.nomRaisonSociale} onChange={(e) => setSous({ nomRaisonSociale: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Adresse</label>
            <input className={inputClass} value={s.adresse} onChange={(e) => setSous({ adresse: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Code postal</label>
            <input className={inputClass} value={s.codePostal} onChange={(e) => setSous({ codePostal: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Ville</label>
            <input className={inputClass} value={s.ville} onChange={(e) => setSous({ ville: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Téléphone</label>
            <input className={inputClass} value={s.telephone} onChange={(e) => setSous({ telephone: e.target.value })} type="tel" />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input className={inputClass} value={s.email} onChange={(e) => setSous({ email: e.target.value })} type="email" />
          </div>
        </div>
        <div className="mt-4">
          <span className={labelClass}>Le maître d&apos;ouvrage est-il le souscripteur ?</span>
          <OuiNonRadios name="mo-sous" value={s.maitreOuvrageEstSouscripteur} onChange={(v) => setSous({ maitreOuvrageEstSouscripteur: v })} />
        </div>
        <div className="mt-4">
          <label className={labelClass}>Qualité du maître d&apos;ouvrage</label>
          <select
            className={inputClass}
            value={s.qualiteMaitreOuvrage}
            onChange={(e) =>
              setSous({
                qualiteMaitreOuvrage: e.target.value as DoEtudeQuestionnaireV1["souscripteur"]["qualiteMaitreOuvrage"],
              })
            }
          >
            <option value="">—</option>
            <option value="particulier">Particulier</option>
            <option value="promoteur">Promoteur</option>
            <option value="sci">SCI</option>
            <option value="autre">Autre</option>
          </select>
          {s.qualiteMaitreOuvrage === "autre" && (
            <input
              className={`${inputClass} mt-2`}
              placeholder="Précisez"
              value={s.qualiteAutre}
              onChange={(e) => setSous({ qualiteAutre: e.target.value })}
            />
          )}
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>2. Informations opération</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Adresse du chantier</label>
            <input className={inputClass} value={o.adresseChantier} onChange={(e) => setOp({ adresseChantier: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Code postal</label>
            <input className={inputClass} value={o.codePostal} onChange={(e) => setOp({ codePostal: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Ville</label>
            <input className={inputClass} value={o.ville} onChange={(e) => setOp({ ville: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Permis de construire n°</label>
            <input className={inputClass} value={o.permisNumero} onChange={(e) => setOp({ permisNumero: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Date DOC (déclaration ouverture chantier)</label>
            <input className={inputClass} type="date" value={o.dateDoc} onChange={(e) => setOp({ dateDoc: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Date début travaux</label>
            <input className={inputClass} type="date" value={o.dateDebutTravaux} onChange={(e) => setOp({ dateDebutTravaux: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Date fin travaux</label>
            <input className={inputClass} type="date" value={o.dateFinTravaux} onChange={(e) => setOp({ dateFinTravaux: e.target.value })} />
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>3. Type de projet</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Type de bâtiment</label>
            <select
              className={inputClass}
              value={tp.typeBatiment}
              onChange={(e) => setTp({ typeBatiment: e.target.value as DoEtudeQuestionnaireV1["typeProjet"]["typeBatiment"] })}
            >
              <option value="">—</option>
              <option value="maison">Maison individuelle</option>
              <option value="immeuble">Immeuble</option>
              <option value="autre">Autre</option>
            </select>
            {tp.typeBatiment === "autre" && (
              <input
                className={`${inputClass} mt-2`}
                value={tp.typeBatimentAutre}
                onChange={(e) => setTp({ typeBatimentAutre: e.target.value })}
              />
            )}
          </div>
          <div>
            <label className={labelClass}>Destination</label>
            <select
              className={inputClass}
              value={tp.destination}
              onChange={(e) => setTp({ destination: e.target.value as DoEtudeQuestionnaireV1["typeProjet"]["destination"] })}
            >
              <option value="">—</option>
              <option value="vente">Vente</option>
              <option value="location">Location</option>
              <option value="personnel">Usage personnel</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Superficie (m²)</label>
            <input className={inputClass} value={tp.superficieM2} onChange={(e) => setTp({ superficieM2: e.target.value })} inputMode="decimal" />
          </div>
          <div>
            <label className={labelClass}>Nombre de bâtiments</label>
            <input className={inputClass} value={tp.nbBatiments} onChange={(e) => setTp({ nbBatiments: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Nombre d&apos;étages</label>
            <input className={inputClass} value={tp.nbEtages} onChange={(e) => setTp({ nbEtages: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Nombre de garages</label>
            <input className={inputClass} value={tp.nbGarages} onChange={(e) => setTp({ nbGarages: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Nombre de caves</label>
            <input className={inputClass} value={tp.nbCaves} onChange={(e) => setTp({ nbCaves: e.target.value })} />
          </div>
        </div>
        <div className="mt-4 grid sm:grid-cols-2 gap-4">
          <div>
            <span className={labelClass}>Piscine</span>
            <OuiNonRadios name="piscine" value={tp.piscine} onChange={(v) => setTp({ piscine: v })} />
          </div>
          <div>
            <span className={labelClass}>Panneaux photovoltaïques</span>
            <OuiNonRadios name="pv" value={tp.photovoltaiques} onChange={(v) => setTp({ photovoltaiques: v })} />
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>4. Coût du projet</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Coût total TTC (€)</label>
            <input className={inputClass} value={c.coutTotalTtc} onChange={(e) => setCout({ coutTotalTtc: e.target.value })} inputMode="decimal" />
          </div>
          <div>
            <label className={labelClass}>Dont travaux</label>
            <input className={inputClass} value={c.dontTravaux} onChange={(e) => setCout({ dontTravaux: e.target.value })} inputMode="decimal" />
          </div>
          <div>
            <label className={labelClass}>Dont honoraires maîtrise d&apos;œuvre</label>
            <input className={inputClass} value={c.dontHonorairesMO} onChange={(e) => setCout({ dontHonorairesMO: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Dont étude de sol</label>
            <input className={inputClass} value={c.dontEtudeSol} onChange={(e) => setCout({ dontEtudeSol: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Dont contrôle technique</label>
            <input className={inputClass} value={c.dontControleTechnique} onChange={(e) => setCout({ dontControleTechnique: e.target.value })} />
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>5. Caractéristiques techniques</h2>
        <div className="mb-4">
          <label className={labelClass}>Type de fondation</label>
          <select
            className={inputClass}
            value={t.typeFondation}
            onChange={(e) => setTech({ typeFondation: e.target.value as DoEtudeQuestionnaireV1["tech"]["typeFondation"] })}
          >
            <option value="">—</option>
            <option value="semelles">Semelles filantes</option>
            <option value="radier">Radier</option>
            <option value="pieux">Pieux</option>
            <option value="autre">Autre</option>
          </select>
          {t.typeFondation === "autre" && (
            <input className={`${inputClass} mt-2`} value={t.typeFondationAutre} onChange={(e) => setTech({ typeFondationAutre: e.target.value })} />
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            ["etudeBetonArme", "Étude béton armé", t.etudeBetonArme],
            ["techniqueCourante", "Technique courante", t.techniqueCourante],
            ["produitsAtex", "Produits avec ATEX / avis technique", t.produitsAtex],
            ["porteeSup7m", "Portée supérieure à 7 m", t.porteeSup7m],
          ].map(([key, lab, val]) => (
            <div key={key as string}>
              <span className={labelClass}>{lab}</span>
              <OuiNonRadios
                name={key as string}
                value={val as OuiNon}
                onChange={(v) => setTech({ [key as keyof DoEtudeQuestionnaireV1["tech"]]: v } as Partial<DoEtudeQuestionnaireV1["tech"]>)}
              />
            </div>
          ))}
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>6. Environnement / terrain</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            ["zoneInondable", "Zone inondable", env.zoneInondable],
            ["solRemblai", "Sol remblai", env.solRemblai],
            ["argileGonflante", "Argile gonflante", env.argileGonflante],
            ["nappeElevee", "Nappe phréatique élevée", env.nappeElevee],
            ["penteSup15", "Terrain pente > 15 %", env.penteSup15],
          ].map(([key, lab, val]) => (
            <div key={key as string}>
              <span className={labelClass}>{lab}</span>
              <OuiNonRadios
                name={key as string}
                value={val as OuiNon}
                onChange={(v) => setEnv({ [key as keyof DoEtudeQuestionnaireV1["environnement"]]: v } as Partial<DoEtudeQuestionnaireV1["environnement"]>)}
              />
            </div>
          ))}
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>7. Travaux spécifiques</h2>
        <div className="mb-4">
          <span className={labelClass}>Travaux sur existant</span>
          <OuiNonRadios name="tsex" value={ts.travauxSurExistant} onChange={(v) => setTs({ travauxSurExistant: v })} />
        </div>
        <p className="text-xs text-[#525252] mb-2">Si oui :</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            ["etancheiteSpecifique", "Étanchéité spécifique", ts.etancheiteSpecifique],
            ["interventionStructure", "Intervention structure", ts.interventionStructure],
            ["surelevation", "Surélévation", ts.surelevation],
            ["desamiantage", "Désamiantage", ts.desamiantage],
          ].map(([key, lab, val]) => (
            <div key={key as string}>
              <span className={labelClass}>{lab}</span>
              <OuiNonRadios
                name={key as string}
                value={val as OuiNon}
                onChange={(v) => setTs({ [key as keyof DoEtudeQuestionnaireV1["travauxSpecifiques"]]: v } as Partial<DoEtudeQuestionnaireV1["travauxSpecifiques"]>)}
              />
            </div>
          ))}
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>8. Garanties souhaitées</h2>
        <div className="space-y-2">
          {[
            ["do", "Dommages ouvrage (DO)", g.do],
            ["trc", "TRC", g.trc],
            ["rcmo", "RC maître d’ouvrage", g.rcmo],
            ["dommagesExistants", "Dommages aux existants", g.dommagesExistants],
          ].map(([key, lab, checked]) => (
            <label key={key as string} className="flex items-center gap-2 text-sm text-[#171717] cursor-pointer">
              <input
                type="checkbox"
                className="accent-[#2563eb] rounded"
                checked={checked as boolean}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    garanties: {
                      ...f.garanties,
                      [key as keyof DoEtudeQuestionnaireV1["garanties"]]: e.target.checked,
                    },
                  }))
                }
              />
              {lab}
            </label>
          ))}
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>9. Intervenants</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Maîtrise d&apos;œuvre — Nom</label>
            <input className={inputClass} value={iv.maitriseOeuvreNom} onChange={(e) => setIv({ maitriseOeuvreNom: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Assureur</label>
            <input className={inputClass} value={iv.maitriseOeuvreAssureur} onChange={(e) => setIv({ maitriseOeuvreAssureur: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>N° police</label>
            <input className={inputClass} value={iv.maitriseOeuvrePolice} onChange={(e) => setIv({ maitriseOeuvrePolice: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Montant mission</label>
            <input className={inputClass} value={iv.maitriseOeuvreMontantMission} onChange={(e) => setIv({ maitriseOeuvreMontantMission: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Bureau de contrôle — Nom</label>
            <input className={inputClass} value={iv.bureauControleNom} onChange={(e) => setIv({ bureauControleNom: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Étude de sol — Société</label>
            <input className={inputClass} value={iv.etudeSolSociete} onChange={(e) => setIv({ etudeSolSociete: e.target.value })} />
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>10. Entreprises par lot</h2>
        <p className="text-sm text-[#525252] mb-3">Répétez pour chaque lot (terrassement, VRD, gros œuvre, etc.)</p>
        {form.lots.map((lot, i) => (
          <div key={i} className="mb-4 p-4 rounded-xl border border-[#e5e5e5] bg-[#fafafa] space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-sm">Lot {i + 1}</span>
              {form.lots.length > 1 && (
                <button type="button" className="text-sm text-red-600 hover:underline" onClick={() => removeLot(i)}>
                  Retirer
                </button>
              )}
            </div>
            <input className={inputClass} placeholder="Lot" value={lot.lot} onChange={(e) => setLot(i, "lot", e.target.value)} />
            <input className={inputClass} placeholder="Entreprise" value={lot.entreprise} onChange={(e) => setLot(i, "entreprise", e.target.value)} />
            <div className="grid sm:grid-cols-2 gap-2">
              <input className={inputClass} placeholder="Assureur" value={lot.assureur} onChange={(e) => setLot(i, "assureur", e.target.value)} />
              <input className={inputClass} placeholder="N° police" value={lot.police} onChange={(e) => setLot(i, "police", e.target.value)} />
              <input className={inputClass} placeholder="SIREN" value={lot.siren} onChange={(e) => setLot(i, "siren", e.target.value)} />
              <input className={inputClass} placeholder="Montant" value={lot.montant} onChange={(e) => setLot(i, "montant", e.target.value)} />
            </div>
          </div>
        ))}
        <button type="button" onClick={addLot} className="text-sm font-semibold text-[#2563eb] hover:underline">
          + Ajouter un lot
        </button>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>11. Documents à fournir</h2>
        <p className={labelClass}>Avant chantier</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4">
          {DO_ETUDE_DOCUMENTS_AVANT.map((id) => (
            <label key={id} className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="accent-[#2563eb] rounded"
                checked={form.documents.avant.includes(id)}
                onChange={() => toggleDoc("avant", id)}
              />
              {DOC_AVANT_LABELS[id]}
            </label>
          ))}
        </div>
        <p className={labelClass}>Après travaux</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {DO_ETUDE_DOCUMENTS_APRES.map((id) => (
            <label key={id} className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="accent-[#2563eb] rounded"
                checked={form.documents.apres.includes(id)}
                onChange={() => toggleDoc("apres", id)}
              />
              {DOC_APRES_LABELS[id]}
            </label>
          ))}
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>12. Validation</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Fait à</label>
            <input className={inputClass} value={v.faitA} onChange={(e) => setForm((f) => ({ ...f, validation: { ...f.validation, faitA: e.target.value } }))} />
          </div>
          <div>
            <label className={labelClass}>Le</label>
            <input className={inputClass} type="date" value={v.le} onChange={(e) => setForm((f) => ({ ...f, validation: { ...f.validation, le: e.target.value } }))} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Nom</label>
            <input className={inputClass} value={v.nom} onChange={(e) => setForm((f) => ({ ...f, validation: { ...f.validation, nom: e.target.value } }))} />
          </div>
        </div>
        <p className="text-xs text-[#525252] mt-2">Signature : à compléter hors ligne ou via processus d&apos;signature qui vous sera indiqué par votre conseiller.</p>
      </section>

      {saveMsg && (
        <div
          className={`rounded-xl p-4 text-sm ${saveMsg.type === "ok" ? "bg-green-50 text-green-900 border border-green-200" : "bg-red-50 text-red-900 border border-red-200"}`}
        >
          {saveMsg.text}
        </div>
      )}

      <div className="flex flex-wrap gap-4 pt-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[#2563eb] px-6 py-3 font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-60"
        >
          {saving ? "Enregistrement…" : "Enregistrer le questionnaire"}
        </button>
        <Link href="/espace-client" className="inline-flex items-center rounded-xl border border-[#d4d4d4] px-6 py-3 font-medium text-[#171717] hover:bg-[#f5f5f5]">
          Retour espace client
        </Link>
      </div>
    </form>
  )
}
