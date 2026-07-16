import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import type { EditorialDraft } from "@/lib/agents/editorial-agent";
import type { Evidence } from "@/lib/schemas/content-plan";
import type { Merchant } from "@/lib/schemas/merchant";

const GeneratedPostSchema = z.object({
  day: z
    .number()
    .int()
    .min(1)
    .max(5),

  caption: z
    .string()
    .min(20)
    .max(400),

  usedEvidenceIds: z
    .array(z.string().min(1))
    .min(1),
});

const GeneratedPlanSchema = z.object({
  posts: z
    .array(GeneratedPostSchema)
    .length(5),
});

export interface WriterResult {
  drafts: EditorialDraft[];
  mode: "ai" | "fallback";
  model: string | null;
  warning: string | null;
}

function createMerchantEvidence(
  merchant: Merchant,
): Evidence {
  return {
    sourceType: "merchant_profile",
    sourceId: merchant.id,
    claim:
      `${merchant.name} est un commerce de type ` +
      `« ${merchant.businessType} » situé à ` +
      `${merchant.city}.`,
  };
}

function deduplicateEvidence(
  evidence: Evidence[],
): Evidence[] {
  const evidenceById = new Map<
    string,
    Evidence
  >();

  for (const item of evidence) {
    evidenceById.set(
      item.sourceId,
      item,
    );
  }

  return [...evidenceById.values()];
}

function addMerchantEvidence(
  merchant: Merchant,
  drafts: EditorialDraft[],
): EditorialDraft[] {
  const merchantEvidence =
    createMerchantEvidence(merchant);

  return drafts.map((draft) => ({
    ...draft,
    evidence: deduplicateEvidence([
      ...draft.evidence,
      merchantEvidence,
    ]),
  }));
}

function buildPromptData(
  merchant: Merchant,
  drafts: EditorialDraft[],
): Record<string, unknown> {
  return {
    merchant: {
      name: merchant.name,
      businessType:
        merchant.businessType,
      city: merchant.city,
      tone: merchant.tone,
      forbiddenClaims:
        merchant.forbiddenClaims,
    },

    posts: drafts.map((draft) => ({
      day: draft.day,
      date: draft.date,
      objective: draft.objective,
      topic: draft.topic,

      fallbackCaption:
        draft.caption,

      allowedEvidence:
        draft.evidence.map(
          (evidence) => ({
            id: evidence.sourceId,
            type: evidence.sourceType,
            fact: evidence.claim,
          }),
        ),
    })),
  };
}

function validateGeneratedPosts(
  drafts: EditorialDraft[],
  generatedPlan: z.infer<
    typeof GeneratedPlanSchema
  >,
): EditorialDraft[] {
  const generatedPostsByDay = new Map(
    generatedPlan.posts.map(
      (post) => [post.day, post],
    ),
  );

  if (generatedPostsByDay.size !== 5) {
    throw new Error(
      "L’agent rédacteur n’a pas produit cinq jours uniques.",
    );
  }

  return drafts.map((draft) => {
    const generatedPost =
      generatedPostsByDay.get(draft.day);

    if (!generatedPost) {
      throw new Error(
        `Aucun texte IA reçu pour le jour ${draft.day}.`,
      );
    }

    const allowedEvidenceIds =
      new Set(
        draft.evidence.map(
          (evidence) =>
            evidence.sourceId,
        ),
      );

    const usedEvidenceIds =
      new Set(
        generatedPost.usedEvidenceIds,
      );

    for (const evidenceId of usedEvidenceIds) {
      if (
        !allowedEvidenceIds.has(
          evidenceId,
        )
      ) {
        throw new Error(
          `L’agent a utilisé une preuve non autorisée : ${evidenceId}.`,
        );
      }
    }

    /*
     * La première preuve est la preuve principale
     * du sujet : produit, service ou commerce.
     */
    const primaryEvidence =
      draft.evidence[0];

    if (
      primaryEvidence &&
      !usedEvidenceIds.has(
        primaryEvidence.sourceId,
      )
    ) {
      throw new Error(
        `La publication du jour ${draft.day} n’utilise pas sa preuve principale.`,
      );
    }

    const selectedEvidence =
      draft.evidence.filter(
        (evidence) =>
          usedEvidenceIds.has(
            evidence.sourceId,
          ),
      );

    return {
      ...draft,
      caption:
        generatedPost.caption.trim(),
      evidence: selectedEvidence,
    };
  });
}

export async function writeEditorialDrafts(
  merchant: Merchant,
  drafts: EditorialDraft[],
): Promise<WriterResult> {
  const groundedDrafts =
    addMerchantEvidence(
      merchant,
      drafts,
    );

  const apiKey =
    process.env.OPENAI_API_KEY?.trim();

  const model =
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-5.6-luna";

  if (!apiKey) {
    return {
      drafts: groundedDrafts,
      mode: "fallback",
      model: null,
      warning:
        "OPENAI_API_KEY absente : les textes déterministes ont été utilisés.",
    };
  }

  try {
    const openai = new OpenAI({
      apiKey,
    });

    const response =
      await openai.responses.parse({
        model,

        input: [
          {
            role: "system",
            content: [
              "Tu es l’agent rédacteur d’un système de communication pour commerces locaux.",
              "Rédige exactement cinq publications en français.",
              "Chaque publication doit contenir une ou deux phrases courtes et naturelles.",
              "Adopte uniquement le ton demandé par le commerçant.",
              "Tu dois utiliser exclusivement les faits présents dans allowedEvidence pour le jour concerné.",
              "Le nom, le type d’activité et la ville du commerçant sont également autorisés.",
              "N’invente jamais une offre, une promotion, un prix, un horaire, un événement, un produit, un service, une livraison ou une caractéristique.",
              "N’affirme jamais qu’un produit est frais, fait maison, bio, local, préparé aujourd’hui ou disponible immédiatement sans preuve explicite.",
              "Ne transforme pas une actualité en événement organisé par le commerce.",
              "Si les preuves sont limitées, rédige une publication sobre plutôt que de compléter les informations.",
              "Liste dans usedEvidenceIds toutes les preuves factuelles réellement utilisées.",
              "La preuve principale du sujet doit obligatoirement être utilisée.",
              "N’utilise ni Markdown ni liste.",
            ].join(" "),
          },
          {
            role: "user",
            content: JSON.stringify(
              buildPromptData(
                merchant,
                groundedDrafts,
              ),
              null,
              2,
            ),
          },
        ],

        text: {
          format: zodTextFormat(
            GeneratedPlanSchema,
            "merchant_content_plan",
          ),
        },

        max_output_tokens: 2000,
      });

    const generatedPlan =
      response.output_parsed;

    if (!generatedPlan) {
      throw new Error(
        "Le modèle n’a retourné aucune réponse structurée.",
      );
    }

    const rewrittenDrafts =
      validateGeneratedPosts(
        groundedDrafts,
        generatedPlan,
      );

    return {
      drafts: rewrittenDrafts,
      mode: "ai",
      model,
      warning: null,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erreur IA inconnue.";

    console.warn(
      "AI writer failed:",
      error,
    );

    return {
      drafts: groundedDrafts,
      mode: "fallback",
      model,
      warning:
        `L’agent rédacteur IA a échoué : ${message} ` +
        "Les textes déterministes ont été utilisés.",
    };
  }
}
