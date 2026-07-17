import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  buildWeatherContexts,
  type WeatherContext,
} from "@/lib/agents/context-agent";
import { buildEditorialDrafts } from "@/lib/agents/editorial-agent";
import {
  buildNewsContexts,
  type NewsContext,
} from "@/lib/agents/news-agent";
import { buildCalendarContexts } from "@/lib/agents/season-agent";
import { validatePost } from "@/lib/agents/validator-agent";
import { selectBestPhoto } from "@/lib/agents/visual-agent";
import { writeEditorialDrafts } from "@/lib/agents/writer-agent";
import {
  ContentPlanSchema,
  type ContentPost,
} from "@/lib/schemas/content-plan";
import { MerchantSchema } from "@/lib/schemas/merchant";
import {
  PhotoLibrarySchema,
  type PhotoCategory,
} from "@/lib/schemas/photo";
import { getCalendarDays } from "@/lib/services/calendar-service";
import { getNewsArticles } from "@/lib/services/news-service";
import { getWeatherForecast } from "@/lib/services/weather-service";

async function readMerchantFile(): Promise<unknown> {
  const absolutePath = join(
    process.cwd(),
    "data",
    "merchant.json",
  );

  const content = await readFile(
    absolutePath,
    "utf-8",
  );

  return JSON.parse(content) as unknown;
}

async function readPhotosFile(): Promise<unknown> {
  const absolutePath = join(
    process.cwd(),
    "data",
    "photos.json",
  );

  const content = await readFile(
    absolutePath,
    "utf-8",
  );

  return JSON.parse(content) as unknown;
}

function parseStartDate(value: unknown): Date {
  if (typeof value !== "string") {
    return new Date();
  }

  const parsedDate = new Date(
    `${value}T12:00:00`,
  );

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(
      "La date de début doit respecter le format YYYY-MM-DD.",
    );
  }

  return parsedDate;
}

function getPreferredPhotoCategory(
  objective: string,
): PhotoCategory {
  if (
    objective.startsWith(
      "Mettre en avant le produit",
    )
  ) {
    return "product";
  }

  if (
    objective.startsWith(
      "Présenter le service",
    )
  ) {
    return "service";
  }

  if (
    objective ===
    "Présenter le commerce"
  ) {
    return "merchant";
  }

  return "ambience";
}

export async function POST(
  request: Request,
): Promise<Response> {
  try {
    const requestBody = await request
      .json()
      .catch(() => ({} as Record<string, unknown>));

    const startDate = parseStartDate(
      (requestBody as Record<string, unknown>)
        .startDate,
    );

    const rawMerchant =
      await readMerchantFile();

    const rawPhotos =
      await readPhotosFile();

    const merchant =
      MerchantSchema.parse(rawMerchant);

    const photos =
      PhotoLibrarySchema.parse(rawPhotos);

    const contextWarnings: string[] = [];

    let newsStatus:
      | "available"
      | "unavailable" = "available";

    let newsCandidateCount = 0;
    let newsContexts: NewsContext[] = [];

    try {
      const merchantKeywords = [
        ...merchant.products
          .filter(
            (product) => product.verified,
          )
          .map((product) => product.name),

        ...merchant.services
          .filter(
            (service) => service.verified,
          )
          .map((service) => service.name),
      ];

      const newsArticles =
        await getNewsArticles({
          city: merchant.city,
          businessType:
            merchant.businessType,
          keywords: merchantKeywords,
          lookbackDays: 7,
          maximumResults: 20,
        });

      newsCandidateCount =
        newsArticles.length;

      newsContexts = buildNewsContexts(
        merchant,
        newsArticles,
      );
    } catch (newsError) {
      newsStatus = "unavailable";

      const message =
        newsError instanceof Error
          ? newsError.message
          : "Erreur d’actualités inconnue.";

      contextWarnings.push(
        `Les actualités n’ont pas pu être récupérées : ${message}`,
      );

      console.warn(
        "News retrieval failed:",
        newsError,
      );
    }

    let weatherStatus:
      | "available"
      | "unavailable" = "available";

    let weatherContexts: WeatherContext[] = [];

    try {
      const forecast = await getWeatherForecast(
        merchant.city,
        startDate,
        5,
      );

      weatherContexts = buildWeatherContexts(
        merchant,
        forecast.days,
      );
    } catch (weatherError) {
      weatherStatus = "unavailable";

      const message =
        weatherError instanceof Error
          ? weatherError.message
          : "Erreur météo inconnue.";

      contextWarnings.push(
        `La météo n’a pas pu être récupérée : ${message}`,
      );

      /*
       * La génération continue sans météo.
       * Une panne externe ne doit pas bloquer le prototype.
       */
      console.warn(
        "Weather retrieval failed:",
        weatherError,
      );
    }

    const calendarDays = getCalendarDays(
      startDate,
      5,
    );

    const calendarContexts =
      buildCalendarContexts(
        merchant,
        calendarDays,
      );

    const deterministicDrafts =
      buildEditorialDrafts(
        merchant,
        startDate,
        weatherContexts,
        calendarContexts,
        newsContexts,
      );

    const writerResult =
      await writeEditorialDrafts(
        merchant,
        deterministicDrafts,
      );

    if (writerResult.warning) {
      contextWarnings.push(
        writerResult.warning,
      );
    }

    const drafts =
      writerResult.drafts;

    const deterministicDraftsByDay = new Map(
      deterministicDrafts.map((draft) => [
        draft.day,
        draft,
      ]),
    );

    const usedPhotoIds = new Set<string>();

    const posts: ContentPost[] = drafts.map(
      (draft) => {
        const preferredCategory =
          getPreferredPhotoCategory(
            draft.objective,
          );

        const visualSelection =
          selectBestPhoto(
            photos,
            `${draft.topic} ${draft.objective} ${draft.caption}`,
            usedPhotoIds,
            preferredCategory,
          );

        usedPhotoIds.add(
          visualSelection.photo.id,
        );

        const createValidatedPost = (
          sourceDraft: typeof draft,
        ): ContentPost => {
          const postWithoutValidation: Omit<
            ContentPost,
            "validation"
          > = {
            ...sourceDraft,

            imageId:
              visualSelection.photo.id,

            imagePath:
              visualSelection.photo.path,

            imageReason:
              visualSelection.reason,

            evidence: [
              ...sourceDraft.evidence,
              {
                sourceType: "photo",
                sourceId:
                  visualSelection.photo.id,
                claim:
                  visualSelection.photo.description,
              },
            ],
          };

          return {
            ...postWithoutValidation,

            validation: validatePost(
              postWithoutValidation,
              merchant,
              photos,
            ),
          };
        };

        const generatedPost =
          createValidatedPost(draft);

        if (
          generatedPost.validation.status ===
            "approved" ||
          writerResult.mode === "fallback"
        ) {
          return generatedPost;
        }

        const deterministicDraft =
          deterministicDraftsByDay.get(
            draft.day,
          );

        if (!deterministicDraft) {
          return generatedPost;
        }

        return createValidatedPost(
          deterministicDraft,
        );
      },
    );

    const weatherContextCount = posts.filter(
      (post) =>
        post.evidence.some(
          (evidence) =>
            evidence.sourceType === "weather",
        ),
    ).length;

    const calendarContextCount =
      posts.filter((post) =>
        post.evidence.some(
          (evidence) =>
            evidence.sourceType === "season",
        ),
      ).length;

    const newsContextCount =
      posts.filter((post) =>
        post.evidence.some(
          (evidence) =>
            evidence.sourceType === "news",
        ),
      ).length;

    const contentPlan =
      ContentPlanSchema.parse({
        merchantId: merchant.id,
        merchantName: merchant.name,
        generatedAt: new Date().toISOString(),
        contextStatus: {
          weather: weatherStatus,
          weatherContextCount,

          calendar: "available",
          calendarContextCount,

          news: newsStatus,
          newsCandidateCount,
          newsContextCount,

          writer: writerResult.mode,
          writerModel: writerResult.model,

          warnings: contextWarnings,
        },
        posts,
      });

    return Response.json(contentPlan);
  } catch (error) {
    console.error(
      "Content plan generation failed:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Une erreur inconnue est survenue.";

    return Response.json(
      {
        error:
          "Impossible de générer le planning éditorial.",
        details: message,
      },
      {
        status: 500,
      },
    );
  }
}
