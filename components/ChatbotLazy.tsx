"use client"

import dynamic from "next/dynamic"

/** Import relatif + default export : évite les ChunkLoadError fréquents avec Turbopack sur `then(default: m.X)`. */
const Chatbot = dynamic(() => import("./Chatbot"), {
  ssr: false,
  loading: () => null,
})

export function ChatbotLazy() {
  return <Chatbot />
}
