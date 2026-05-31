import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { asJsonObject } from "@/lib/json-object"
import type { AssuranceTitreData } from "@/lib/assurance-titre-types"
import {
  ASSURANCE_TITRE_ETUDE_VERSION,
  emptyAssuranceTitreEtudeQuestionnaire,
  mergeAssuranceTitreEtudeForm,
  prefillAssuranceTitreEtudeFromInitial,
  type AssuranceTitreEtudeQuestionnaireV1,
} from "@/lib/assurance-titre-etude-questionnaire-types"
import { sendAssuranceTitreEtudeSavedAlert } from "@/lib/devis-alert"

async function getInitialForUser(
  userId: string,
  emailNorm: string
): Promise<(Partial<AssuranceTitreData> & { email?: string | null }) | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { titleInitialQuestionnaireJson: true },
  })
  if (user?.titleInitialQuestionnaireJson) {
    try {
      return JSON.parse(user.titleInitialQuestionnaireJson) as Partial<AssuranceTitreData> & { email?: string | null }
    } catch {
      /* ignore */
    }
  }

  const lead = await prisma.devisAssuranceTitreLead.findFirst({
    where: { email: { equals: emailNorm, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
  })
  if (lead?.data) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { titleInitialQuestionnaireJson: lead.data },
      })
      return JSON.parse(lead.data) as Partial<AssuranceTitreData> & { email?: string | null }
    } catch {
      /* ignore */
    }
  }

  return null
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const emailNorm = session.user.email.trim().toLowerCase()
    const initial = await getInitialForUser(session.user.id, emailNorm)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { titleEtudeQuestionnaireJson: true },
    })

    let savedEtude: Partial<AssuranceTitreEtudeQuestionnaireV1> | null = null
    if (user?.titleEtudeQuestionnaireJson) {
      try {
        savedEtude = JSON.parse(user.titleEtudeQuestionnaireJson) as Partial<AssuranceTitreEtudeQuestionnaireV1>
      } catch {
        /* ignore */
      }
    }

    const prefilled = initial
      ? prefillAssuranceTitreEtudeFromInitial({
          ...initial,
          email: session.user.email,
        })
      : emptyAssuranceTitreEtudeQuestionnaire()
    const form = mergeAssuranceTitreEtudeForm(prefilled, savedEtude)

    return NextResponse.json({
      useEspaceClientOnly: initial != null,
      hasInitial: initial != null,
      hasEtudeSaved: Boolean(user?.titleEtudeQuestionnaireJson?.trim()),
      form,
    })
  } catch (error) {
    console.error("[title-questionnaire GET]", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const rawBody = await request.json().catch(() => null)
    const body = rawBody
      ? asJsonObject<{ form?: AssuranceTitreEtudeQuestionnaireV1 }>(rawBody)
      : null
    if (!body?.form || body.form.version !== ASSURANCE_TITRE_ETUDE_VERSION) {
      return NextResponse.json({ error: "Formulaire invalide" }, { status: 400 })
    }

    const emailClient = session.user.email?.trim()
    if (!emailClient) {
      return NextResponse.json({ error: "Email de session manquant" }, { status: 400 })
    }

    const before = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { titleEtudeQuestionnaireJson: true },
    })
    const isUpdate = Boolean(before?.titleEtudeQuestionnaireJson?.trim())

    await prisma.user.update({
      where: { id: session.user.id },
      data: { titleEtudeQuestionnaireJson: JSON.stringify(body.form) },
    })

    void sendAssuranceTitreEtudeSavedAlert({
      clientEmail: emailClient,
      contactName: body.form.contact.nomComplet?.trim() || body.form.contact.raisonSociale?.trim() || undefined,
      assetCity: body.form.bien.villeBien?.trim() || undefined,
      isUpdate,
    }).catch((error) => console.error("[title-questionnaire PUT] alerte interne:", error))

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[title-questionnaire PUT]", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
