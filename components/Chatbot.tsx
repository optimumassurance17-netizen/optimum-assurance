"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"

const contactEmail = process.env.NEXT_PUBLIC_EMAIL || "contact@optimum-assurance.fr"

export function Chatbot() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener("open-chatbot", handler)
    return () => window.removeEventListener("open-chatbot", handler)
  }, [])
  const SUGGESTIONS = [
    "Combien coûte une assurance décennale ?",
    "Comment obtenir mon attestation ?",
    "Acceptez-vous les sociétés résiliées ?",
    "Comment déclarer un sinistre ?",
  ]

  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    {
      role: "assistant",
      content: "Bonjour ! Je suis l'assistant Optimum Assurance. Posez-moi vos questions sur l'assurance décennale, le dommage ouvrage ou la souscription. Nous sommes 100 % en ligne — pas de téléphone.",
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [messages])

  const sendMessage = async (text: string) => {
    const trimmed = text.trim().slice(0, 500)
    if (!trimmed || loading) return

    setInput("")
    setMessages((m) => [...m, { role: "user", content: trimmed }])
    setLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      })
      const data = await res.json()
      const reply = data.reply || "Désolé, je n'ai pas pu répondre. Écrivez-nous à " + contactEmail
      setMessages((m) => [...m, { role: "assistant", content: reply }])
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Une erreur est survenue. Contactez-nous par email : " + contactEmail,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const send = () => sendMessage(input)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed z-[110] flex items-center gap-2 bg-[#2563eb] text-white px-4 py-3 rounded-full shadow-lg hover:bg-[#1d4ed8] transition-all hover:scale-105 bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[max(1.5rem,env(safe-area-inset-right))]"
        aria-label={open ? "Fermer le chat" : "Ouvrir l'assistant"}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <span className="font-semibold text-sm hidden sm:inline">Assistant</span>
      </button>

      {open && (
        <div
          className="fixed z-[110] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:w-96 sm:max-w-none max-h-[min(70vh,100dvh-8rem)] flex flex-col bg-white rounded-2xl shadow-2xl border border-[#e5e5e5] overflow-hidden bottom-[max(6.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] right-[max(1rem,env(safe-area-inset-right))] sm:bottom-24 sm:right-6"
          role="dialog"
          aria-label="Chat assistant Optimum Assurance"
        >
          <div className="flex items-center justify-between px-4 py-3 bg-[#2563eb] text-white">
            <span className="font-semibold">Assistant Optimum</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Fermer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px] max-h-[400px]"
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "bg-[#2563eb] text-white rounded-br-md"
                      : "bg-[#f5f5f5] text-[#0a0a0a] rounded-bl-md"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.role === "assistant" && /faq|questions fréquentes/i.test(msg.content) && (
                    <Link
                      href="/faq"
                      className="inline-block mt-2 text-[#2563eb] font-medium hover:underline"
                    >
                      Voir la FAQ →
                    </Link>
                  )}
                  {msg.role === "assistant" && /devis|tarif|souscri/i.test(msg.content) && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Link
                        href="/devis"
                        className="text-[#2563eb] font-medium hover:underline"
                      >
                        Devis décennale →
                      </Link>
                      <Link
                        href="/devis-dommage-ouvrage"
                        className="text-[#2563eb] font-medium hover:underline"
                      >
                        Devis DO →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {messages.length === 1 && !loading && (
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sendMessage(s)}
                    className="text-xs px-3 py-2 rounded-xl bg-[#eff6ff] border border-[#2563eb]/30 text-[#2563eb] hover:bg-[#2563eb] hover:text-white transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#f5f5f5] rounded-2xl rounded-bl-md px-4 py-2.5">
                  <span className="inline-flex gap-1">
                    <span className="w-2 h-2 bg-[#2563eb] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-[#2563eb] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-[#2563eb] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-[#e5e5e5]">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Posez votre question..."
                className="flex-1 border border-[#d4d4d4] rounded-xl px-4 py-2.5 text-sm bg-[#e4e4e4] text-[#0a0a0a] placeholder:text-[#404040] focus:ring-2 focus:ring-[#2563eb]/50 focus:border-[#2563eb] outline-none"
              />
              <button
                type="button"
                onClick={send}
                disabled={loading || !input.trim()}
                className="bg-[#2563eb] text-white px-4 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1d4ed8] transition-all"
              >
                Envoyer
              </button>
            </div>
            <p className="text-xs text-[#171717] mt-2 text-center">
              100 % en ligne — <a href={`mailto:${contactEmail}`} className="text-[#2563eb] hover:underline">{contactEmail}</a>
            </p>
          </div>
        </div>
      )}
    </>
  )
}
