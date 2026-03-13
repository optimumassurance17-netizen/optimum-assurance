import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { randomBytes } from "crypto"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getNextNumero } from "@/lib/documents"

function generateVerificationToken(): string {
  return randomBytes(16).toString("hex")
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()
    const { type, data, numero: customNumero } = body

    if (!type || !["devis", "contrat", "attestation"].includes(type)) {
      return NextResponse.json({ error: "Type invalide" }, { status: 400 })
    }

    const numero =
      customNumero && typeof customNumero === "string" && customNumero.length > 0
        ? customNumero
        : await getNextNumero(type)

    try {
      const document = await prisma.document.create({
        data: {
          userId: session.user.id,
          type,
          numero,
          data: JSON.stringify(data),
          ...(type === "attestation" && {
            verificationToken: generateVerificationToken(),
            status: "valide",
          }),
        },
      })

      return NextResponse.json({
        id: document.id,
        numero: document.numero,
        verificationToken: document.verificationToken,
      })
    } catch (err: unknown) {
      // Contrat déjà créé par webhook Yousign (numero unique)
      const prismaErr = err as { code?: string }
      if (prismaErr?.code === "P2002" && type === "contrat") {
        const existing = await prisma.document.findFirst({
          where: { type: "contrat", numero },
        })
        if (existing) {
          return NextResponse.json({
            id: existing.id,
            numero: existing.numero,
            verificationToken: existing.verificationToken,
          })
        }
      }
      throw err
    }
  } catch (error) {
    console.error("Erreur création document:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création" },
      { status: 500 }
    )
  }
}
