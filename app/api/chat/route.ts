import { NextRequest, NextResponse } from "next/server"
import { CHATBOT_SYSTEM_PROMPT, findBestFaqMatch } from "@/lib/chatbot-context"

export async function POST(req: NextRequest) {
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
    }

    const faqReply = findBestFaqMatch(trimmed)
    if (faqReply) {
      return NextResponse.json({
        reply: faqReply + "\n\nPour toute question personnalisée, écrivez-nous à contact@optimum-assurance.fr",
      })
    }

    return NextResponse.json({
      reply: "Je n'ai pas trouvé de réponse précise à votre question. Pour une réponse personnalisée, contactez-nous par email à contact@optimum-assurance.fr — nous répondons sous 24h. Vous pouvez aussi consulter notre FAQ : /faq",
    })
  } catch (err) {
    console.error("[chat]", err)
    return NextResponse.json(
      {
        reply: "Une erreur est survenue. Contactez-nous par email à contact@optimum-assurance.fr — nous vous répondrons sous 24h.",
      },
      { status: 200 }
    )
  }
}
