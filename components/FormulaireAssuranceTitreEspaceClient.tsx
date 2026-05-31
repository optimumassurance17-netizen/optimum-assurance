"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  ASSURANCE_TITRE_BESOIN_OPTIONS,
  ASSURANCE_TITRE_BIEN_OPTIONS,
  ASSURANCE_TITRE_OPERATION_OPTIONS,
  ASSURANCE_TITRE_PROFIL_OPTIONS,
  ASSURANCE_TITRE_RISQUE_OPTIONS,
  type AssuranceTitreRisqueIdentifie,
} from "@/lib/assurance-titre-types"
import {
  ASSURANCE_TITRE_ETUDE_DOCUMENT_LABELS,
  ASSURANCE_TITRE_ETUDE_DOCUMENTS,
  ASSURANCE_TITRE_ETUDE_VERSION,
  emptyAssuranceTitreEtudeQuestionnaire,
  type AssuranceTitreEtudeQuestionnaireV1,
  type OuiNon,
} from "@/lib/assurance-titre-etude-questionnaire-types"
import { inputFieldBg, inputTextDark } from "@/lib/form-input-styles"
import { readResponseJson } from "@/lib/read-response-json"

const inputClass = `w-full rounded-xl px-4 py-3 font-medium ${inputFieldBg} ${inputTextDark}`
const labelClass = "mb-1.5 block text-sm font-semibold text-[#0a0a0a]"
const sectionClass = "mb-10 rounded-2xl border border-[#e5e5e5] bg-white p-6 shadow-sm"
const h2Class = "mb-4 border-b border-[#e5e5e5] pb-2 text-lg font-bold text-[#0a0a0a]"

function OuiNonRadios({
  name,
  value,
  onChange,
}: {
  name: string
  value: OuiNon
  onChange: (value: OuiNon) => void
}) {
  return (
    <div className="mt-1 flex flex-wrap gap-4">
      {(["oui", "non"] as const).map((choice) => (
        <label
          key={choice}
          className="inline-flex cursor-pointer items-center gap-2 text-sm text-[#171717]"
        >
          <input
            type="radio"
            name={name}
            checked={value === choice}
            onChange={() => onChange(choice)}
            className="accent-[#2563eb]"
          />
          {choice === "oui" ? "Oui" : "Non"}
        </label>
      ))}
    </div>
  )
}

export function FormulaireAssuranceTitreEspaceClient() {
  const [form, setForm] = useState<AssuranceTitreEtudeQuestionnaireV1>(() =>
    emptyAssuranceTitreEtudeQuestionnaire()
  )
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/client/title-questionnaire")
        const json = await readResponseJson<{
          error?: string
          form?: AssuranceTitreEtudeQuestionnaireV1
          hasInitial?: boolean
        }>(res)
        if (!res.ok) throw new Error(json.error || "Chargement impossible")
        if (!json.hasInitial) {
          setLoadError(
            "Aucune première demande Assurance titre n’est associée à votre compte. Commencez par la page publique, ou contactez-nous."
          )
          setLoading(false)
          return
        }
        if (json.form && !cancelled) setForm(json.form)
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Erreur")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const setContact = useCallback((patch: Partial<AssuranceTitreEtudeQuestionnaireV1["contact"]>) => {
    setForm((current) => ({ ...current, contact: { ...current.contact, ...patch } }))
  }, [])
  const setOperation = useCallback((patch: Partial<AssuranceTitreEtudeQuestionnaireV1["operation"]>) => {
    setForm((current) => ({ ...current, operation: { ...current.operation, ...patch } }))
  }, [])
  const setBien = useCallback((patch: Partial<AssuranceTitreEtudeQuestionnaireV1["bien"]>) => {
    setForm((current) => ({ ...current, bien: { ...current.bien, ...patch } }))
  }, [])
  const setParties = useCallback((patch: Partial<AssuranceTitreEtudeQuestionnaireV1["parties"]>) => {
    setForm((current) => ({ ...current, parties: { ...current.parties, ...patch } }))
  }, [])
  const setRisque = useCallback((patch: Partial<AssuranceTitreEtudeQuestionnaireV1["risque"]>) => {
    setForm((current) => ({ ...current, risque: { ...current.risque, ...patch } }))
  }, [])
  const setDocuments = useCallback((patch: Partial<AssuranceTitreEtudeQuestionnaireV1["documents"]>) => {
    setForm((current) => ({ ...current, documents: { ...current.documents, ...patch } }))
  }, [])
  const setValidation = useCallback((patch: Partial<AssuranceTitreEtudeQuestionnaireV1["validation"]>) => {
    setForm((current) => ({ ...current, validation: { ...current.validation, ...patch } }))
  }, [])

  const toggleRisk = useCallback((risk: AssuranceTitreRisqueIdentifie) => {
    setForm((current) => {
      const already = current.risque.risquesIdentifies.includes(risk)
      return {
        ...current,
        risque: {
          ...current.risque,
          risquesIdentifies: already
            ? current.risque.risquesIdentifies.filter((item) => item !== risk)
            : [...current.risque.risquesIdentifies, risk],
        },
      }
    })
  }, [])

  const toggleDoc = useCallback((doc: string) => {
    setForm((current) => {
      const already = current.documents.piecesDisponibles.includes(doc)
      return {
        ...current,
        documents: {
          ...current.documents,
          piecesDisponibles: already
            ? current.documents.piecesDisponibles.filter((item) => item !== doc)
            : [...current.documents.piecesDisponibles, doc],
        },
      }
    })
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setSaveMsg(null)
    try {
      const payload = { ...form, version: ASSURANCE_TITRE_ETUDE_VERSION }
      const res = await fetch("/api/client/title-questionnaire", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form: payload }),
      })
      const json = await readResponseJson<{ error?: string }>(res)
      if (!res.ok) throw new Error(json.error || "Enregistrement impossible")
      setSaveMsg({
        type: "ok",
        text: "Questionnaire enregistré. Vous pouvez poursuivre le dépôt des pièces dans votre espace client.",
      })
    } catch (error) {
      setSaveMsg({ type: "err", text: error instanceof Error ? error.message : "Erreur" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="py-8 text-[#171717]">Chargement du questionnaire…</p>
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900">
        <p className="mb-3">{loadError}</p>
        <Link href="/assurance-titre" className="font-semibold text-[#2563eb] hover:underline">
          Aller à la demande Assurance titre
        </Link>
      </div>
    )
  }

  const c = form.contact
  const o = form.operation
  const b = form.bien
  const p = form.parties
  const r = form.risque
  const d = form.documents
  const v = form.validation

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <p className="mb-6 text-sm text-[#525252]">
        Les informations de votre première demande sont préremplies. Complétez les champs pour permettre un traitement
        100 % digital du dossier avant retour de l’équipe.
      </p>

      <section className={sectionClass}>
        <h2 className={h2Class}>1. Contact et dossier</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Nom / interlocuteur</label>
            <input className={inputClass} value={c.nomComplet} onChange={(e) => setContact({ nomComplet: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Raison sociale / structure</label>
            <input className={inputClass} value={c.raisonSociale} onChange={(e) => setContact({ raisonSociale: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>SIRET</label>
            <input className={inputClass} value={c.siret} onChange={(e) => setContact({ siret: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input className={inputClass} type="email" value={c.email} onChange={(e) => setContact({ email: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Téléphone</label>
            <input className={inputClass} type="tel" value={c.telephone} onChange={(e) => setContact({ telephone: e.target.value })} />
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>2. Opération et bien</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Profil du souscripteur</label>
            <select
              className={inputClass}
              value={o.profilSouscripteur}
              onChange={(e) => setOperation({ profilSouscripteur: e.target.value as typeof o.profilSouscripteur })}
            >
              <option value="">—</option>
              {ASSURANCE_TITRE_PROFIL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Type d’opération</label>
            <select
              className={inputClass}
              value={o.typeOperation}
              onChange={(e) => setOperation({ typeOperation: e.target.value as typeof o.typeOperation })}
            >
              <option value="">—</option>
              {ASSURANCE_TITRE_OPERATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Type de bien</label>
            <select
              className={inputClass}
              value={o.typeBien}
              onChange={(e) => setOperation({ typeBien: e.target.value as typeof o.typeBien })}
            >
              <option value="">—</option>
              {ASSURANCE_TITRE_BIEN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Besoin principal</label>
            <select
              className={inputClass}
              value={o.besoinPrincipal}
              onChange={(e) => setOperation({ besoinPrincipal: e.target.value as typeof o.besoinPrincipal })}
            >
              <option value="">—</option>
              {ASSURANCE_TITRE_BESOIN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Montant de l’opération (€)</label>
            <input
              className={inputClass}
              type="number"
              min={0}
              step={1000}
              value={o.montantOperation}
              onChange={(e) => setOperation({ montantOperation: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Date cible de signature</label>
            <input
              className={inputClass}
              type="date"
              value={o.dateSignaturePrevue}
              onChange={(e) => setOperation({ dateSignaturePrevue: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <span className={labelClass}>Financement / prêteur impliqué</span>
            <OuiNonRadios
              name="title-financement"
              value={o.financementExterne}
              onChange={(value) => setOperation({ financementExterne: value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Adresse du bien</label>
            <input className={inputClass} value={b.adresseBien} onChange={(e) => setBien({ adresseBien: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Code postal</label>
            <input className={inputClass} value={b.codePostalBien} onChange={(e) => setBien({ codePostalBien: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Ville</label>
            <input className={inputClass} value={b.villeBien} onChange={(e) => setBien({ villeBien: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Référence cadastrale</label>
            <input className={inputClass} value={b.referenceCadastrale} onChange={(e) => setBien({ referenceCadastrale: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Lot / lot de copropriété</label>
            <input className={inputClass} value={b.numeroLot} onChange={(e) => setBien({ numeroLot: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Occupation du bien</label>
            <select
              className={inputClass}
              value={b.occupationBien}
              onChange={(e) => setBien({ occupationBien: e.target.value as typeof b.occupationBien })}
            >
              <option value="">—</option>
              <option value="libre">Libre</option>
              <option value="occupe">Occupé</option>
              <option value="loue">Loué</option>
              <option value="vacant">Vacant</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Commentaires sur le bien</label>
            <textarea
              className={`${inputClass} min-h-[110px] resize-y`}
              value={b.commentaireBien}
              onChange={(e) => setBien({ commentaireBien: e.target.value })}
            />
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>3. Parties prenantes et calendrier</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Notaire</label>
            <input className={inputClass} value={p.notaireNom} onChange={(e) => setParties({ notaireNom: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Email du notaire</label>
            <input className={inputClass} type="email" value={p.notaireEmail} onChange={(e) => setParties({ notaireEmail: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Vendeur / cédant</label>
            <input className={inputClass} value={p.vendeurNom} onChange={(e) => setParties({ vendeurNom: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Banque / prêteur</label>
            <input className={inputClass} value={p.banqueNom} onChange={(e) => setParties({ banqueNom: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Contact banque / financeur</label>
            <input className={inputClass} value={p.banqueContact} onChange={(e) => setParties({ banqueContact: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Avocat / conseil</label>
            <input className={inputClass} value={p.avocatConseil} onChange={(e) => setParties({ avocatConseil: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <span className={labelClass}>Closing à traiter en urgence</span>
            <OuiNonRadios
              name="title-urgence"
              value={r.urgenceClosing}
              onChange={(value) => setRisque({ urgenceClosing: value })}
            />
          </div>
          {r.urgenceClosing === "oui" && (
            <div className="sm:col-span-2">
              <label className={labelClass}>Délai cible / date limite</label>
              <input className={inputClass} value={r.delaiCible} onChange={(e) => setRisque({ delaiCible: e.target.value })} placeholder="Ex. signature prévue le 15/06, financement à purger avant le 10/06" />
            </div>
          )}
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>4. Risques, anomalies et contentieux</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {ASSURANCE_TITRE_RISQUE_OPTIONS.map((option) => {
            const checked = r.risquesIdentifies.includes(option.value)
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors ${
                  checked ? "border-violet-300 bg-violet-50 text-violet-950" : "border-slate-200 bg-slate-50 text-slate-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleRisk(option.value)}
                  className="mt-1 rounded border-slate-300"
                />
                <span>{option.label}</span>
              </label>
            )
          })}
        </div>
        <div className="mt-4">
          <label className={labelClass}>Détails des anomalies / historique du dossier</label>
          <textarea
            className={`${inputClass} min-h-[140px] resize-y`}
            value={r.detailsAnomalies}
            onChange={(e) => setRisque({ detailsAnomalies: e.target.value })}
            placeholder="Précisez les servitudes, inscriptions, écarts de désignation, réserves du notaire, points de blocage, etc."
          />
        </div>
        <div className="mt-4">
          <span className={labelClass}>Contentieux, contestation ou réclamation connue</span>
          <OuiNonRadios
            name="title-contentieux"
            value={r.contentieuxConnu}
            onChange={(value) => setRisque({ contentieuxConnu: value })}
          />
        </div>
        {r.contentieuxConnu === "oui" && (
          <div className="mt-4">
            <label className={labelClass}>Précisions contentieuses</label>
            <textarea
              className={`${inputClass} min-h-[120px] resize-y`}
              value={r.contentieuxDetails}
              onChange={(e) => setRisque({ contentieuxDetails: e.target.value })}
            />
          </div>
        )}
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>5. Pièces et validation</h2>
        <p className="mb-4 text-sm text-[#171717]">
          Indiquez les pièces déjà disponibles, puis déposez-les dans l’onglet Documents de votre espace client.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {ASSURANCE_TITRE_ETUDE_DOCUMENTS.map((doc) => {
            const checked = d.piecesDisponibles.includes(doc)
            return (
              <label
                key={doc}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors ${
                  checked ? "border-blue-300 bg-blue-50 text-blue-950" : "border-slate-200 bg-slate-50 text-slate-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleDoc(doc)}
                  className="mt-1 rounded border-slate-300"
                />
                <span>{ASSURANCE_TITRE_ETUDE_DOCUMENT_LABELS[doc]}</span>
              </label>
            )
          })}
        </div>
        <div className="mt-4">
          <label className={labelClass}>Commentaires sur les pièces ou pièces manquantes</label>
          <textarea
            className={`${inputClass} min-h-[110px] resize-y`}
            value={d.commentairePieces}
            onChange={(e) => setDocuments({ commentairePieces: e.target.value })}
          />
        </div>

        <div className="mt-6 space-y-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-[#171717]">
            <input
              type="checkbox"
              checked={v.exactitudeDeclarations}
              onChange={(e) => setValidation({ exactitudeDeclarations: e.target.checked })}
              className="mt-1 rounded border-slate-300"
            />
            <span>Je confirme l’exactitude des informations transmises à ce stade du dossier.</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-[#171717]">
            <input
              type="checkbox"
              checked={v.acceptationSuiviDigital}
              onChange={(e) => setValidation({ acceptationSuiviDigital: e.target.checked })}
              className="mt-1 rounded border-slate-300"
            />
            <span>J’accepte le suivi du dossier et les échanges documentaires via l’espace client et l’email.</span>
          </label>
        </div>
      </section>

      {saveMsg ? (
        <div
          className={`rounded-xl border p-4 text-sm ${
            saveMsg.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {saveMsg.text}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[#2563eb] px-6 py-3 font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-50"
        >
          {saving ? "Enregistrement..." : "Enregistrer le questionnaire"}
        </button>
        <Link
          href="/espace-client"
          className="text-sm font-semibold text-[#2563eb] hover:underline"
        >
          Retour à l’espace client
        </Link>
      </div>
    </form>
  )
}
