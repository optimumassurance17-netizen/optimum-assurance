"use client"

import dynamic from "next/dynamic"

const Chatbot = dynamic(() => import("@/components/Chatbot").then((m) => ({ default: m.Chatbot })), {
  ssr: false,
  loading: () => null,
})

export function ChatbotLazy() {
  return <Chatbot />
}
