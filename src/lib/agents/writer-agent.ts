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

const OllamaResponseSchema = z.object({
  model: z.string(),

  message: z.object({
    role: z.string(),
    content: z.string(),
  }),

  done: z.boolean().optional(),
  done_reason: z.string().optional(),
});

export interface WriterResult {
  drafts: EditorialDraft[];
  mode: "ollama" | "fallback";
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

interface GeneratedPostsValidation {
  drafts: EditorialDraft[];
  fallbackDays: number[];
}

function validateGeneratedPosts(
  drafts: EditorialDraft[],
  generatedPlan: z.infer<
    typeof GeneratedPlanSchema
  >,
): GeneratedPostsValidation {
  const generatedPostsByDay = new Map(
    generatedPlan.posts.map((post) => [
      post.day,
      post,
    ]),
  );

  const fallbackDays: number[] = [];

  const validatedDrafts = drafts.map((draft) => {
    const generatedPost =
      generatedPostsByDay.get(draft.day);

    if (!generatedPost) {
      fallbackDays.push(draft.day);
      return draft;
    }

    const allowedEvidenceIds = new Set(
      draft.evidence.map(
        (evidence) => evidence.sourceId,
      ),
    );

    const containsUnauthorizedEvidence =
      generatedPost.usedEvidenceIds.some(
        (evidenceId) =>
          !allowedEvidenceIds.has(evidenceId),
      );

    if (containsUnauthorizedEvidence) {
      fallbackDays.push(draft.day);
      return draft;
    }

    const primaryEvidence =
      draft.evidence[0];

    if (
      primaryEvidence &&
      !generatedPost.usedEvidenceIds.includes(
        primaryEvidence.sourceId,
      )
    ) {
      fallbackDays.push(draft.day);
      return draft;
    }

    const usedEvidenceIds = new Set(
      generatedPost.usedEvidenceIds,
    );

    const selectedEvidence =
      draft.evidence.filter((evidence) =>
        usedEvidenceIds.has(
          evidence.sourceId,
        ),
      );

    return {
      ...draft,
      caption: generatedPost.caption.trim(),
      evidence: selectedEvidence,
    };
  });

  return {
    drafts: validatedDrafts,
    fallbackDays,
  };
}

function normalizeBaseUrl(
  value: string,
): string {
  return value.replace(/\/+$/, "");
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

  const baseUrl = normalizeBaseUrl(
    process.env.OLLAMA_BASE_URL?.trim() ||
      "http://127.0.0.1:11434",
  );

  const model =
    process.env.OLLAMA_MODEL?.trim() ||
    "llama3.2:3b";

  const outputSchema =
    z.toJSONSchema(
      GeneratedPlanSchema,
    );

  try {
    const promptData = buildPromptData(
      merchant,
      groundedDrafts,
    );

    const response = await fetch(
      `${baseUrl}/api/chat`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
          Accept: "application/json",
        },

        signal:
          AbortSignal.timeout(
            120_000,
          ),

        body: JSON.stringify({
          model,

          messages: [
            {
              role: "system",

              content: [
                "Tu es l’agent rédacteur d’un système de communication pour commerces locaux.",
                "Rédige exactement cinq publications en français.",
                "Chaque publication contient une ou deux phrases courtes et naturelles.",
                "Chaque publication doit être reformulée de manière originale et ne doit pas suivre un modèle répétitif.",
                "Varie les débuts de phrases entre les cinq publications.",
                "Respecte le ton indiqué par le commerçant.",
                "Utilise exclusivement les faits disponibles dans allowedEvidence pour le jour concerné.",
                "Chaque publication possède sa propre liste allowedEvidence.",
                "N’utilise jamais une preuve provenant d’un autre jour.",
                "Pour chaque jour, copie uniquement les identifiants présents dans la liste allowedEvidence de ce même jour.",
                "Le nom, le type d’activité et la ville du commerçant sont autorisés uniquement lorsqu’ils figurent dans les preuves.",
                "N’invente jamais une offre, une promotion, un prix, un horaire, un événement, un produit, un service ou une livraison.",
                "N’affirme jamais qu’un produit est frais, fait maison, bio, local, préparé aujourd’hui ou disponible immédiatement sans preuve explicite.",
                "N’affirme jamais qu’un service, une terrasse ou le commerce est ouvert sans preuve explicite liée au jour concerné.",
                "N’utilise pas les expressions « pour tous les goûts », « large choix » ou « grande variété » sans preuve explicite.",
                "N’utilise aucun adjectif qualitatif comme frais, délicieux, gourmand, confortable, exceptionnel ou unique sans preuve explicite.",
                "N’affirme jamais que le commerce est incontournable, préféré, meilleur ou qu’il constitue un commerce de prédilection.",
                "Ne dis pas « nous vous proposons » lorsqu’une preuve confirme seulement que le commerce vend un produit.",
                "Ne répète pas la date de publication dans la légende sauf si elle est utile au contexte.",
                "Rédige une publication sobre si tu ne disposes que du nom du produit.",
                "Ne transforme pas une actualité en événement organisé par le commerce.",
                "Si les preuves sont limitées, rédige une publication sobre.",
                "Liste dans usedEvidenceIds toutes les preuves factuelles réellement utilisées.",
                "La preuve principale du sujet doit obligatoirement être utilisée.",
                "Réponds uniquement avec le JSON demandé.",
              ].join(" "),
            },

            {
              role: "user",

              content:
                "Voici les données vérifiées :\n" +
                JSON.stringify(
                  promptData,
                  null,
                  2,
                ) +
                "\n\nVoici le schéma JSON obligatoire :\n" +
                JSON.stringify(
                  outputSchema,
                  null,
                  2,
                ),
            },
          ],

          stream: false,

          format: outputSchema,

          options: {
            temperature: 0,
            num_ctx: 8192,
          },

          keep_alive: "10m",
        }),
      },
    );

    if (!response.ok) {
      const responseBody =
        await response.text();

      throw new Error(
        `Ollama a répondu avec le statut ` +
        `${response.status} : ${responseBody}`,
      );
    }

    const rawResponse =
      (await response.json()) as unknown;

    const ollamaResponse =
      OllamaResponseSchema.parse(
        rawResponse,
      );

    const parsedContent =
      JSON.parse(
        ollamaResponse.message.content,
      ) as unknown;

    const generatedPlan =
      GeneratedPlanSchema.parse(
        parsedContent,
      );

    const validationResult =
      validateGeneratedPosts(
        groundedDrafts,
        generatedPlan,
      );

    const allPostsUsedFallback =
      validationResult.fallbackDays.length ===
      groundedDrafts.length;

    const warning =
      validationResult.fallbackDays.length > 0
        ? `Les publications des jours ${
            validationResult.fallbackDays.join(", ")
          } ont été remplacées par leur version sécurisée.`
        : null;

    return {
      drafts: validationResult.drafts,
      mode: allPostsUsedFallback
        ? "fallback"
        : "ollama",
      model:
        ollamaResponse.model || model,
      warning,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erreur Ollama inconnue.";

    console.warn(
      "Local AI writer failed:",
      error,
    );

    return {
      drafts: groundedDrafts,
      mode: "fallback",
      model,
      warning:
        `Le rédacteur Ollama a échoué : ${message} ` +
        "Les textes déterministes ont été utilisés.",
    };
  }
}
