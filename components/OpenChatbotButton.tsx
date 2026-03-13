"use client"

export function OpenChatbotButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("open-chatbot"))}
      className="flex flex-col items-center p-6 bg-[var(--background)] rounded-2xl border border-[#e5e5e5] hover:border-[#C65D3B]/40 hover:bg-[#FEF3F0] transition-all group text-left w-full"
    >
      <span className="text-3xl mb-3">🤖</span>
      <p className="font-semibold text-[#0a0a0a]">Assistant IA</p>
      <p className="text-sm text-[#171717] mt-1">Réponses instantanées</p>
      <p className="text-xs text-[#C65D3B] mt-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Ouvrir le chat</p>
    </button>
  )
}
