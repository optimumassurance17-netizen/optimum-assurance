"use client"

import Link from "next/link"
import { useEffect, useState, type ReactNode } from "react"
import type { AdsPack, AdsProduct } from "@/lib/ads-robot"

type Status = {
  configured: boolean
  developerToken: boolean
  openai: boolean
  storageReady?: boolean
  connection: {
    accountEmail: string | null
    customerId: string | null
    connectedAt: string
    connectedByEmail: string | null
  } | null
}

type Campaign = { id: string; name: string; status: string }

function copyText(value: string) {
  return navigator.clipboard.writeText(value)
}

export function AdsStudio() {
  const [status, setStatus] = useState<Status | null>(null)
  const [statusError, setStatusError] = useState("")
  const [customers, setCustomers] = useState<string[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState("")
  const [product, setProduct] = useState<AdsProduct>("decennale")
  const [city, setCity] = useState("")
  const [angle, setAngle] = useState("")
  const [pack, setPack] = useState<AdsPack | null>(null)

  async function loadStatus() {
    const response = await fetch("/api/gestion/ads/google/status")
    if (response.status === 401) {
      setStatusError("Cette page est réservée à la gestion.")
      return
    }
    if (!response.ok) {
      setStatusError("Impossible de lire la connexion Google Ads.")
      return
    }
    setStatus((await response.json()) as Status)
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("google") === "connecte") setNotice("Compte Google Ads connecté.")
    if (params.get("google") === "erreur") {
      setNotice("La connexion Google Ads n'a pas abouti. Relancez-la depuis cette page.")
    }
    void loadStatus()
  }, [])

  async function run(label: string, task: () => Promise<void>) {
    setBusy(label)
    setNotice("")
    try {
      await task()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Action impossible.")
    } finally {
      setBusy("")
    }
  }

  return (
    <main className="min-h-screen bg-[#1a1a1a] text-gray-200">
      <header className="border-b border-gray-700 px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-gray-400">Gestion</p>
            <h1 className="text-xl font-semibold text-white">Publicité</h1>
          </div>
          <Link href="/gestion" className="text-sm text-[#93c5fd] hover:underline">
            Retour au CRM
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <p className="text-sm text-gray-300">
          Le robot prépare les textes Google Ads, Meta et TikTok. Il ne publie rien et ne lance aucune dépense.
        </p>
        {statusError ? <p className="text-red-400">{statusError}</p> : null}
        {notice ? (
          <p className="rounded border border-gray-600 bg-[#252525] px-4 py-3 text-sm" role="status">
            {notice}
          </p>
        ) : null}

        <section className="rounded border border-gray-700 bg-[#252525] p-5">
          <h2 className="text-lg font-semibold text-white">Google Ads</h2>
          {!status ? (
            <p className="mt-3 text-sm text-gray-400">Chargement…</p>
          ) : (
            <div className="mt-3 space-y-3 text-sm">
              {status.storageReady === false ? (
                <p className="text-amber-200">
                  La connexion ne peut pas encore être enregistrée. Appliquez la migration AdsConnection sur la base.
                </p>
              ) : null}
              <p>
                Connexion OAuth : {status.configured ? "prête" : "identifiants Google manquants"}. Lecture des
                campagnes : {status.developerToken ? "prête" : "jeton développeur manquant"}.
              </p>
              {status.connection ? (
                <p>
                  Compte {status.connection.accountEmail || "Google"} connecté
                  {status.connection.customerId ? `, client ${status.connection.customerId}` : ""}.
                </p>
              ) : (
                <p>Aucun compte Google Ads n&apos;est connecté.</p>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded bg-[#2563eb] px-3 py-2 text-white disabled:opacity-50"
                  disabled={!status.configured || Boolean(busy)}
                  onClick={() => {
                    window.location.href = "/api/gestion/ads/google/connect"
                  }}
                >
                  Connecter Google Ads
                </button>
                {status.connection ? (
                  <button
                    type="button"
                    className="rounded border border-gray-500 px-3 py-2 disabled:opacity-50"
                    disabled={Boolean(busy)}
                    onClick={() =>
                      void run("Déconnexion", async () => {
                        const response = await fetch("/api/gestion/ads/google/disconnect", { method: "POST" })
                        if (!response.ok) throw new Error("Déconnexion impossible.")
                        setCustomers([])
                        setCampaigns([])
                        await loadStatus()
                        setNotice("Compte Google Ads déconnecté.")
                      })
                    }
                  >
                    Déconnecter
                  </button>
                ) : null}
              </div>
              {status.connection && status.developerToken ? (
                <div className="space-y-3 border-t border-gray-700 pt-3">
                  <button
                    type="button"
                    className="rounded border border-gray-500 px-3 py-2 disabled:opacity-50"
                    disabled={Boolean(busy)}
                    onClick={() =>
                      void run("Comptes", async () => {
                        const response = await fetch("/api/gestion/ads/google/customers")
                        const body = (await response.json()) as { customers?: string[]; error?: string }
                        if (!response.ok) throw new Error(body.error || "Comptes introuvables.")
                        setCustomers(body.customers || [])
                      })
                    }
                  >
                    Voir les comptes accessibles
                  </button>
                  {customers.length > 0 ? (
                    <label className="block">
                      Compte à lire
                      <select
                        className="mt-1 block rounded border border-gray-600 bg-[#1a1a1a] px-3 py-2"
                        value={status.connection.customerId || ""}
                        onChange={(event) =>
                          void run("Compte", async () => {
                            const response = await fetch("/api/gestion/ads/google/customers", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ customerId: event.target.value }),
                            })
                            const body = (await response.json()) as { error?: string }
                            if (!response.ok) throw new Error(body.error || "Compte refusé.")
                            await loadStatus()
                          })
                        }
                      >
                        <option value="">Choisir</option>
                        {customers.map((id) => (
                          <option key={id} value={id}>
                            {id}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <button
                    type="button"
                    className="rounded border border-gray-500 px-3 py-2 disabled:opacity-50"
                    disabled={Boolean(busy) || !status.connection.customerId}
                    onClick={() =>
                      void run("Campagnes", async () => {
                        const response = await fetch("/api/gestion/ads/google/campaigns")
                        const body = (await response.json()) as { campaigns?: Campaign[]; error?: string }
                        if (!response.ok) throw new Error(body.error || "Campagnes illisibles.")
                        setCampaigns(body.campaigns || [])
                      })
                    }
                  >
                    Lire les campagnes
                  </button>
                  {campaigns.length > 0 ? (
                    <ul className="space-y-1">
                      {campaigns.map((campaign) => (
                        <li key={campaign.id}>
                          {campaign.name} — {campaign.status}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </section>

        <section className="rounded border border-gray-700 bg-[#252525] p-5">
          <h2 className="text-lg font-semibold text-white">Robot Meta, Google et TikTok</h2>
          <p className="mt-2 text-sm text-gray-400">
            {status?.openai
              ? "OpenAI est configuré. S'il ne répond pas, les textes de secours sont utilisés."
              : "OpenAI n'est pas configuré : les textes viennent du modèle interne."}
          </p>
          <form
            className="mt-4 grid gap-3 md:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault()
              void run("Génération", async () => {
                const response = await fetch("/api/gestion/ads/generate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ product, city, angle }),
                })
                const body = (await response.json()) as AdsPack & { error?: string }
                if (!response.ok) throw new Error(body.error || "Génération impossible.")
                setPack(body)
              })
            }}
          >
            <label className="text-sm">
              Produit
              <select
                className="mt-1 block w-full rounded border border-gray-600 bg-[#1a1a1a] px-3 py-2"
                value={product}
                onChange={(event) => setProduct(event.target.value as AdsProduct)}
              >
                <option value="decennale">Décennale</option>
                <option value="dommage-ouvrage">Dommage ouvrage</option>
                <option value="les-deux">Décennale et dommage ouvrage</option>
              </select>
            </label>
            <label className="text-sm">
              Ville
              <input
                className="mt-1 block w-full rounded border border-gray-600 bg-[#1a1a1a] px-3 py-2"
                value={city}
                maxLength={24}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Lyon"
              />
            </label>
            <label className="text-sm">
              Angle
              <input
                className="mt-1 block w-full rounded border border-gray-600 bg-[#1a1a1a] px-3 py-2"
                value={angle}
                maxLength={40}
                onChange={(event) => setAngle(event.target.value)}
                placeholder="Plombiers"
              />
            </label>
            <button
              type="submit"
              className="rounded bg-[#2563eb] px-3 py-2 text-white disabled:opacity-50 md:col-span-3 md:w-fit"
              disabled={Boolean(busy)}
            >
              {busy === "Génération" ? "Préparation…" : "Générer les textes"}
            </button>
          </form>

          {pack ? (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-gray-400">
                Source : {pack.source === "openai" ? "OpenAI" : "modèle interne"}.
                {pack.warning ? ` ${pack.warning}` : ""}
              </p>
              <div className="grid gap-4 lg:grid-cols-3">
                <AdCard
                  title="Google Ads"
                  text={[...pack.google.headlines, "", ...pack.google.descriptions].join("\n")}
                >
                  <p className="font-medium text-white">Titres</p>
                  <ul className="list-disc pl-4">
                    {pack.google.headlines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  <p className="mt-2 font-medium text-white">Descriptions</p>
                  <ul className="list-disc pl-4">
                    {pack.google.descriptions.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </AdCard>
                <AdCard
                  title="Meta"
                  text={[pack.meta.primaryText, pack.meta.headline, pack.meta.description, pack.meta.cta].join("\n")}
                >
                  <p>{pack.meta.primaryText}</p>
                  <p className="mt-2 font-medium text-white">{pack.meta.headline}</p>
                  <p>{pack.meta.description}</p>
                  <p className="mt-2 text-[#93c5fd]">{pack.meta.cta}</p>
                </AdCard>
                <AdCard
                  title="TikTok"
                  text={[pack.tiktok.hook, ...pack.tiktok.script, pack.tiktok.caption, pack.tiktok.hashtags.join(" ")].join(
                    "\n"
                  )}
                >
                  <p className="font-medium text-white">{pack.tiktok.hook}</p>
                  <ol className="mt-2 list-decimal pl-4">
                    {pack.tiktok.script.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ol>
                  <p className="mt-2">{pack.tiktok.caption}</p>
                  <p className="mt-2 text-[#93c5fd]">{pack.tiktok.hashtags.join(" ")}</p>
                </AdCard>
              </div>
              <ul className="space-y-1 text-xs text-gray-400">
                {pack.mentions.map((mention) => (
                  <li key={mention}>{mention}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}

function AdCard({
  title,
  text,
  children,
}: {
  title: string
  text: string
  children: ReactNode
}) {
  const [copied, setCopied] = useState(false)
  return (
    <article className="rounded border border-gray-700 bg-[#1a1a1a] p-4 text-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-white">{title}</h3>
        <button
          type="button"
          className="text-[#93c5fd] hover:underline"
          onClick={() => {
            void copyText(text).then(() => {
              setCopied(true)
              window.setTimeout(() => setCopied(false), 1500)
            })
          }}
        >
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
      {children}
    </article>
  )
}
