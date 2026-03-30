import { NextRequest, NextResponse } from "next/server"
import { CHATBOT_SYSTEM_PROMPT, findBestFaqMatch } from "@/lib/chatbot-context"
import { rateLimitResponse } from "@/lib/rate-limit"

const FALLBACK_REPLY =
  "Je n'ai pas trouvé de réponse précise à votre question. Pour une réponse personnalisée, contactez-nous par email à contact@optimum-assurance.fr — nous répondons sous 24h. Vous pouvez aussi consulter notre FAQ : /faq"

function getFaqReply(message: string): string | null {
  const reply = findBestFaqMatch(message)
  if (reply) {
    return reply + "\n\nPour toute question personnalisée, écrivez-nous à contact@optimum-assurance.fr"
  }
  return null
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitResponse(req, "chat")
  if (limited) return limited

  try {
    const { message } = await req.json()
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message requis" }, { status: 400 })
    }

    const trimmed = message.trim().slice(0, 500)
    if (!trimmed) {
      return NextResponse.json({ error: "Message vide" }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY

    if (apiKey) {
      try {
        const OpenAI = (await import("openai")).default
        const openai = new OpenAI({ apiKey })

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: CHATBOT_SYSTEM_PROMPT },
            { role: "user", content: trimmed },
          ],
          max_tokens: 500,
        })

        const text = completion.choices[0]?.message?.content?.trim()
        if (text) {
          return NextResponse.json({ reply: text })
        }
      } catch (openaiErr) {
        console.error("[chat] OpenAI error:", openaiErr)
        const faqReply = getFaqReply(trimmed)
        if (faqReply) return NextResponse.json({ reply: faqReply })
      }
    }

    const faqReply = getFaqReply(trimmed)
    if (faqReply) {
      return NextResponse.json({ reply: faqReply })
    }

    return NextResponse.json({ reply: FALLBACK_REPLY })
  } catch (err) {
    console.error("[chat]", err)
    return NextResponse.json({ reply: FALLBACK_REPLY }, { status: 200 })
  }
}
