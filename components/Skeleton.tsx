export function SkeletonCard() {
  return (
    <div className="bg-white border border-[#F0EBE3] rounded-xl p-4 animate-pulse">
      <div className="h-4 bg-[#E5E0D8] rounded w-1/3 mb-3" />
      <div className="h-8 bg-[#E5E0D8] rounded w-1/2" />
    </div>
  )
}

export function SkeletonDocumentRow() {
  return (
    <div className="flex items-center justify-between p-4 bg-[#F9F6F0] rounded-xl">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-[#E5E0D8] rounded" />
        <div className="space-y-2">
          <div className="h-4 bg-[#E5E0D8] rounded w-24" />
          <div className="h-3 bg-[#E5E0D8] rounded w-16" />
        </div>
      </div>
      <div className="h-4 bg-[#E5E0D8] rounded w-12" />
    </div>
  )
}
