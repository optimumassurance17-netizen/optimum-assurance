"use client"

import { useState, useEffect } from "react"
import {
  DOC_TYPES_DECENNALE,
  DOC_TYPES_DO,
  UPLOAD_DOC_LABELS,
} from "@/lib/user-document-types"

interface UploadedDoc {
  id: string
  type: string
  filename: string
  size: number
  createdAt: string
}

const typeIcons: Record<string, string> = {
  kbis: "🏢",
  piece_identite: "🪪",
  justificatif_activite: "📋",
  qualification: "📜",
  rib: "🏦",
  releve_sinistralite: "📊",
  permis_construire: "🏗️",
  doc_droc: "📅",
  plans_construction: "📐",
  convention_maitrise_oeuvre: "✍️",
  convention_controle_technique: "🔍",
  rapport_etude_sol: "🌍",
}

export function GedUpload() {
  const [uploaded, setUploaded] = useState<UploadedDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchList = async () => {
    try {
      const res = await fetch("/api/documents/uploaded/list")
      if (res.ok) {
        const data = await res.json()
        setUploaded(data)
      }
    } catch {
      setUploaded([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList()
  }, [])

  const handleUpload = async (type: string, file: File) => {
    setError(null)
    setUploading(type)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", type)

      const res = await fetch("/api/documents/uploaded/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Erreur lors de l'upload")
        return
      }
      await fetchList()
    } catch {
      setError("Erreur lors de l'upload")
    } finally {
      setUploading(null)
    }
  }

  const handleDelete = async (id: string) => {
    setError(null)
    try {
      const res = await fetch(`/api/documents/uploaded/${id}`, { method: "DELETE" })
      if (res.ok) await fetchList()
      else setError("Erreur lors de la suppression")
    } catch {
      setError("Erreur lors de la suppression")
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-[#e5e5e5] rounded-2xl p-6 shadow-sm animate-pulse">
        <div className="h-6 bg-[#e5e5e5] rounded w-48 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-[#e5e5e5] rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#f5f5f5] border border-[#d4d4d4] rounded-2xl p-6 shadow-sm">
      <h2 className="font-bold text-[#0a0a0a] mb-2 text-lg">
        Mes documents personnels (GED)
      </h2>
      <p className="text-sm text-[#171717] mb-6">
        Décennale : KBIS, pièce d&apos;identité, justificatif d&apos;activité, qualification, RIB. Dommage ouvrage : permis de construire, DOC/DROC, plans, conventions maîtrise d&apos;œuvre et contrôle technique, rapport étude de sol. PDF ou image (max 10 Mo).
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-[#0a0a0a] mb-3 text-sm">Décennale</h3>
          <div className="space-y-4">
            {DOC_TYPES_DECENNALE.map((type) => docRow(type, uploaded, uploading, handleUpload, handleDelete))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-[#0a0a0a] mb-3 text-sm">Dommage ouvrage</h3>
          <div className="space-y-4">
            {DOC_TYPES_DO.map((type) => docRow(type, uploaded, uploading, handleUpload, handleDelete))}
          </div>
        </div>
      </div>
    </div>
  )
}

function docRow(
  type: string,
  uploaded: UploadedDoc[],
  uploading: string | null,
  handleUpload: (type: string, file: File) => void,
  handleDelete: (id: string) => void
) {
  const doc = uploaded.find((d) => d.type === type)
  const isUploading = uploading === type

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
  }

  return (
    <div
      key={type}
      className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-[#e4e4e4] rounded-xl border border-[#d4d4d4]"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-2xl">{typeIcons[type] || "📄"}</span>
        <div>
          <p className="font-medium text-[#0a0a0a]">
            {UPLOAD_DOC_LABELS[type as keyof typeof UPLOAD_DOC_LABELS]}
          </p>
          {doc ? (
            <p className="text-sm text-[#171717] truncate">
              {doc.filename} — {formatSize(doc.size)}
            </p>
          ) : (
            <p className="text-sm text-[#171717]">Non déposé</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:ml-auto">
        {doc && (
          <>
            <a
              href={`/api/documents/uploaded/${doc.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2563eb] font-medium text-sm hover:underline"
            >
              Voir
            </a>
            <button
              type="button"
              onClick={() => handleDelete(doc.id)}
              className="text-red-600 font-medium text-sm hover:underline"
            >
              Supprimer
            </button>
          </>
        )}
        <label className="cursor-pointer">
          <input
            type="file"
            accept=".pdf,image/jpeg,image/jpg,image/png,image/webp"
            className="sr-only"
            disabled={isUploading}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleUpload(type, f)
              e.target.value = ""
            }}
          />
          <span className="inline-block bg-[#2563eb] text-white px-4 py-2 rounded-xl hover:bg-[#1d4ed8] text-sm font-medium transition-all">
            {isUploading ? "Envoi..." : doc ? "Remplacer" : "Déposer"}
          </span>
        </label>
      </div>
    </div>
  )
}
