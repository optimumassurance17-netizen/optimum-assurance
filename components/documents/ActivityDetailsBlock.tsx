"use client"

import { buildActivityDocumentDetails } from "@/lib/activity-document-details"

type ActivityDetailsBlockProps = {
  activities: string[]
  title?: string
}

export function ActivityDetailsBlock({
  activities,
  title = "Definition et exclusions par activite",
}: ActivityDetailsBlockProps) {
  const details = buildActivityDocumentDetails(activities)
  if (details.length === 0) return null

  return (
    <div className="mb-6">
      <h3 className="font-bold text-black mb-2 uppercase text-xs">{title}</h3>
      <div className="space-y-3">
        {details.map((detail) => (
          <div
            key={detail.key}
            className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] p-3"
          >
            <p className="font-semibold text-sm text-black">
              {detail.activityLabel}
              {detail.code ? ` (Code ${detail.code})` : ""}
            </p>
            <p className="text-xs text-[#171717] mt-1">
              <span className="font-medium">Definition :</span> {detail.definition}
            </p>
            <p className="text-xs text-[#171717] mt-2 font-medium">
              Exclusions specifiques :
            </p>
            <ul className="list-disc list-inside text-xs text-[#171717] mt-1 space-y-1">
              {detail.exclusions.map((line) => (
                <li key={`${detail.key}-${line}`}>{line}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
