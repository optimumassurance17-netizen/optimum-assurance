import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { DevisDommageOuvrageData } from "@/lib/dommage-ouvrage-types"
import { sendDoEtudeSavedAlert } from "@/lib/devis-alert"
import { mergeDoEtudeForm, prefillDoEtudeFromInitial } from "@/lib/do-etude-prefill"
import { DO_ETUDE_VERSION, emptyDoEtudeQuestionnaire, type DoEtudeQuestionnaireV1 } from "@/lib/do-etude-questionnaire-types"
import { asJsonObject } from "@/lib/json-object"

async function getInitialForUser(
  userId: string,
  emailNorm: string
): Promise<Partial<DevisDommageOuvrageData> | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { doInitialQuestionnaireJson: true },
  })
  if (user?.doInitialQuestionnaireJson) {
    try {
      return JSON.parse(user.doInitialQuestionnaireJson) as Partial<DevisDommageOuvrageData>
    } catch {
      /* ignore */
    }
  }
  const lead = await prisma.devisDommageOuvrageLead.findFirst({
    where: { email: { equals: emailNorm, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
  })
  if (lead?.data) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { doInitialQuestionnaireJson: lead.data },
      })
      return JSON.parse(lead.data) as Partial<DevisDommageOuvrageData>
    } catch {
      /* ignore */
    }
  }
  return null
}

/**
 * GET : formulaire d’étude fusionné (préremplissage 1er devis + brouillon sauvegardé).
 * `useEspaceClientOnly` : connecté et 1ère demande déjà enregistrée → ne plus repasser par le questionnaire public.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }
    const emailNorm = session.user.email.trim()
    const initial = await getInitialForUser(session.user.id, emailNorm)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { doEtudeQuestionnaireJson: true },
    })
    let savedEtude: Partial<DoEtudeQuestionnaireV1> | null = null
    if (user?.doEtudeQuestionnaireJson) {
      try {
        savedEtude = JSON.parse(user.doEtudeQuestionnaireJson) as Partial<DoEtudeQuestionnaireV1>
      } catch {
        /* ignore */
      }
    }
    const prefilled = initial ? prefillDoEtudeFromInitial(initial) : emptyDoEtudeQuestionnaire()
    const form = mergeDoEtudeForm(prefilled, savedEtude)

    return NextResponse.json({
      useEspaceClientOnly: initial != null,
      hasInitial: initial != null,
      hasEtudeSaved: Boolean(user?.doEtudeQuestionnaireJson?.trim()),
      form,
    })
  } catch (e) {
    console.error("[do-questionnaire GET]", e)
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
    const body = rawBody ? asJsonObject<{ form?: DoEtudeQuestionnaireV1 }>(rawBody) : null
    if (!body?.form || body.form.version !== DO_ETUDE_VERSION) {
      return NextResponse.json({ error: "Formulaire invalide" }, { status: 400 })
    }
    const emailClient = session.user.email?.trim()
    if (!emailClient) {
      return NextResponse.json({ error: "Email de session manquant" }, { status: 400 })
    }

    const avant = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { doEtudeQuestionnaireJson: true },
    })
    const isUpdate = Boolean(avant?.doEtudeQuestionnaireJson?.trim())

    await prisma.user.update({
      where: { id: session.user.id },
      data: { doEtudeQuestionnaireJson: JSON.stringify(body.form) },
    })

    const nom = body.form.souscripteur?.nomRaisonSociale?.trim()
    const villeChantier = body.form.operation?.ville?.trim()
    void sendDoEtudeSavedAlert({
      clientEmail: emailClient,
      souscripteurNom: nom || undefined,
      chantierLieu: villeChantier || undefined,
      isUpdate,
    }).catch((e) => console.error("[do-questionnaire PUT] alerte interne:", e))

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[do-questionnaire PUT]", e)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
