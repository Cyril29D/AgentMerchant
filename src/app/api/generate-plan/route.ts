import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  buildWeatherContexts,
  type WeatherContext,
} from "@/lib/agents/context-agent";
import { buildEditorialDrafts } from "@/lib/agents/editorial-agent";
import { validatePost } from "@/lib/agents/validator-agent";
import { selectBestPhoto } from "@/lib/agents/visual-agent";
import {
  ContentPlanSchema,
  type ContentPost,
} from "@/lib/schemas/content-plan";
import { MerchantSchema } from "@/lib/schemas/merchant";
import { PhotoLibrarySchema } from "@/lib/schemas/photo";
import { getWeatherForecast } from "@/lib/services/weather-service";

async function readJsonFile(
  relativePath: string,
): Promise<unknown> {
  const absolutePath = join(
    process.cwd(),
    relativePath,
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

    const rawMerchant = await readJsonFile(
      "data/merchant.json",
    );

    const rawPhotos = await readJsonFile(
      "data/photos.json",
    );

    const merchant =
      MerchantSchema.parse(rawMerchant);

    const photos =
      PhotoLibrarySchema.parse(rawPhotos);

    let weatherStatus:
      | "available"
      | "unavailable" = "available";

    let weatherContexts: WeatherContext[] = [];
    const contextWarnings: string[] = [];

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

    const drafts = buildEditorialDrafts(
      merchant,
      startDate,
      weatherContexts,
    );

    const usedPhotoIds = new Set<string>();

    const posts: ContentPost[] = drafts.map(
      (draft) => {
        const visualSelection = selectBestPhoto(
          photos,
          `${draft.topic} ${draft.objective} ${draft.caption}`,
          usedPhotoIds,
        );

        usedPhotoIds.add(
          visualSelection.photo.id,
        );

        const postWithoutValidation: Omit<
          ContentPost,
          "validation"
        > = {
          ...draft,
          imageId: visualSelection.photo.id,
          imagePath: visualSelection.photo.path,
          imageReason: visualSelection.reason,
          evidence: [
            ...draft.evidence,
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
      },
    );

    const weatherContextCount = posts.filter(
      (post) =>
        post.evidence.some(
          (evidence) =>
            evidence.sourceType === "weather",
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