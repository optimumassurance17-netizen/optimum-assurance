import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { DevisDommageOuvrageData } from "@/lib/dommage-ouvrage-types"
import { sendDoEtudeSavedAlert } from "@/lib/devis-alert"
import { mergeDoEtudeForm, prefillDoEtudeFromInitial, sanitizeDoEtudeForm } from "@/lib/do-etude-prefill"
import { DO_ETUDE_VERSION, emptyDoEtudeQuestionnaire, type DoEtudeQuestionnaireV1 } from "@/lib/do-etude-questionnaire-types"
import { asJsonObject } from "@/lib/json-object"
import {
  buildDoSouscriptionInsurancePayload,
  coutTotalFromDoData,
} from "@/lib/build-do-souscription-payload"
import { loadDoSouscriptionPayloadForUser } from "@/lib/do-souscription-resume"

async function getInitialForUser(
  userId: string,
  emailNorm: string
): Promise<{ data: Partial<DevisDommageOuvrageData>; coutTotal: number | null } | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { doInitialQuestionnaireJson: true },
  })
  if (user?.doInitialQuestionnaireJson) {
    try {
      return {
        data: JSON.parse(user.doInitialQuestionnaireJson) as Partial<DevisDommageOuvrageData>,
        coutTotal: null,
      }
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
        select: { id: true },
      })
    } catch (error) {
      console.error("[do-questionnaire] copie demande initiale:", error)
    }
    try {
      return {
        data: JSON.parse(lead.data) as Partial<DevisDommageOuvrageData>,
        coutTotal: lead.coutTotal,
      }
    } catch {
      return null
    }
  }
  return null
}

function saveErrorMessage(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error ? String((error as { code: unknown }).code) : ""
  if (code === "P2021" || code === "P2022") {
    return "La base n'a pas toutes les colonnes du dossier. Le questionnaire n'a pas été enregistré."
  }
  return "Enregistrement impossible"
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
    const storedInitial = await getInitialForUser(session.user.id, emailNorm)
    const initial = storedInitial?.data ?? null
    const coutInitial = storedInitial
      ? storedInitial.coutTotal && storedInitial.coutTotal > 0
        ? storedInitial.coutTotal
        : coutTotalFromDoData(storedInitial.data)
      : 0
    let canContinueOnline = Boolean(
      initial && buildDoSouscriptionInsurancePayload(initial, coutInitial)
    )
    if (!canContinueOnline) {
      canContinueOnline = Boolean(
        await loadDoSouscriptionPayloadForUser(session.user.id, emailNorm)
      )
    }
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
    const form = sanitizeDoEtudeForm(mergeDoEtudeForm(prefilled, savedEtude))

    return NextResponse.json({
      useEspaceClientOnly: initial != null,
      hasInitial: initial != null,
      canContinueOnline,
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
    const incoming = body?.form
    const form =
      incoming && typeof incoming === "object"
        ? sanitizeDoEtudeForm({ ...emptyDoEtudeQuestionnaire(), ...incoming, version: DO_ETUDE_VERSION })
        : null
    if (!form) {
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
      data: { doEtudeQuestionnaireJson: JSON.stringify(form) },
      select: { id: true },
    })

    const nom = form.souscripteur.nomRaisonSociale.trim()
    const villeChantier = form.operation.ville.trim()
    void sendDoEtudeSavedAlert({
      clientEmail: emailClient,
      souscripteurNom: nom || undefined,
      chantierLieu: villeChantier || undefined,
      isUpdate,
    }).catch((e) => console.error("[do-questionnaire PUT] alerte interne:", e))

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[do-questionnaire PUT]", e)
    return NextResponse.json({ error: saveErrorMessage(e) }, { status: 500 })
  }
}
