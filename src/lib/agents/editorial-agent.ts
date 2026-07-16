import { addDays, format } from "date-fns";

import type { WeatherContext } from "@/lib/agents/context-agent";
import type { CalendarContext } from "@/lib/agents/season-agent";
import type { Evidence } from "@/lib/schemas/content-plan";
import type { Merchant } from "@/lib/schemas/merchant";

export interface EditorialDraft {
  day: number;
  date: string;
  objective: string;
  topic: string;
  caption: string;
  context: string[];
  evidence: Evidence[];
}

type EditorialTheme =
  | { type: "product"; index: number }
  | { type: "service"; index: number }
  | { type: "merchant" };

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR");
}

function isTerraceDraft(
  draft: EditorialDraft,
): boolean {
  return normalize(draft.topic).includes("terrasse");
}

const WEATHER_KEYWORDS: Record<
  WeatherContext["kind"],
  string[]
> = {
  heat: [
    "boisson fraîche",
    "boissons fraîches",
    "glace",
    "glaces",
    "climatisation",
    "climatisé",
  ],
  cold: [
    "boisson chaude",
    "café",
    "thé",
    "chocolat chaud",
    "soupe",
  ],
  rain: [
    "livraison",
    "intérieur",
    "salle intérieure",
    "commande en ligne",
  ],
  outdoor: [
    "terrasse",
  ],
};

function isWeatherRelevantForDraft(
  draft: EditorialDraft,
  weatherContext: WeatherContext,
): boolean {
  if (weatherContext.kind === "outdoor") {
    return isTerraceDraft(draft);
  }

  const draftText = normalize(
    `${draft.topic} ${draft.objective} ${draft.caption}`,
  );

  return WEATHER_KEYWORDS[weatherContext.kind].some(
    (keyword) =>
      draftText.includes(normalize(keyword)),
  );
}

function isCalendarRelevantForDraft(
  draft: EditorialDraft,
  calendarContext: CalendarContext,
): boolean {
  if (calendarContext.kind === "season") {
    return isTerraceDraft(draft);
  }

  return true;
}

function enrichDraftsWithWeather(
  drafts: EditorialDraft[],
  weatherContexts: WeatherContext[],
): EditorialDraft[] {
  let weatherPublicationCount = 0;

  return drafts.map((draft) => {
    if (weatherPublicationCount >= 2) {
      return draft;
    }

    const weatherContext = weatherContexts.find(
      (context) => context.date === draft.date,
    );

    if (!weatherContext) {
      return draft;
    }

    /*
     * Le contexte météo n'est utilisé que s'il est
     * pertinent pour le contenu de la publication.
     */
    if (
      !isWeatherRelevantForDraft(
        draft,
        weatherContext,
      )
    ) {
      return draft;
    }

    weatherPublicationCount += 1;

    return {
      ...draft,
      caption:
        `${weatherContext.captionLead} ` +
        `${draft.caption}`,
      context: [
        ...draft.context,
        weatherContext.summary,
      ],
      evidence: [
        ...draft.evidence,
        weatherContext.evidence,
      ],
    };
  });
}

function enrichDraftsWithCalendar(
  drafts: EditorialDraft[],
  calendarContexts: CalendarContext[],
): EditorialDraft[] {
  let calendarPublicationCount = 0;

  return drafts.map((draft) => {
    if (calendarPublicationCount >= 2) {
      return draft;
    }

    /*
     * On évite de mélanger météo et calendrier
     * dans la même publication.
     */
    if (draft.context.length > 0) {
      return draft;
    }

    const calendarContext =
      calendarContexts.find(
        (context) =>
          context.date === draft.date &&
          isCalendarRelevantForDraft(
            draft,
            context,
          ),
      );

    if (!calendarContext) {
      return draft;
    }

    calendarPublicationCount += 1;

    return {
      ...draft,
      caption:
        `${calendarContext.captionLead} ` +
        `${draft.caption}`,
      context: [
        ...draft.context,
        calendarContext.summary,
      ],
      evidence: [
        ...draft.evidence,
        calendarContext.evidence,
      ],
    };
  });
}

export function buildEditorialDrafts(
  merchant: Merchant,
  startDate: Date,
  weatherContexts: WeatherContext[] = [],
  calendarContexts: CalendarContext[] = [],
): EditorialDraft[] {
  const products = merchant.products.filter(
    (product) => product.verified,
  );

  const services = merchant.services.filter(
    (service) => service.verified,
  );

  if (
    products.length === 0 &&
    services.length === 0
  ) {
    throw new Error(
      "Le commerçant ne possède aucun produit ou service vérifié.",
    );
  }

  const themes: EditorialTheme[] = [
    products.length > 0
      ? { type: "product", index: 0 }
      : { type: "service", index: 0 },

    services.length > 0
      ? { type: "service", index: 0 }
      : { type: "product", index: 1 },

    { type: "merchant" },

    products.length > 0
      ? { type: "product", index: 1 }
      : { type: "service", index: 0 },

    products.length > 0
      ? { type: "product", index: 2 }
      : { type: "service", index: 0 },
  ];

  const drafts = themes.map((theme, index) => {
    const commonData = {
      day: index + 1,
      date: format(
        addDays(startDate, index),
        "yyyy-MM-dd",
      ),
      context: [],
    };

    if (theme.type === "product") {
      const product =
        products[theme.index % products.length];

      return {
        ...commonData,
        objective:
          `Mettre en avant le produit ` +
          `« ${product.name} »`,
        topic: product.name,
        caption:
          `Aujourd’hui, ${merchant.name} met en avant ` +
          `« ${product.name} ». ` +
          `Rendez-vous à ${merchant.city} pour découvrir cette sélection.`,
        evidence: [
          {
            sourceType: "product" as const,
            sourceId: product.id,
            claim:
              `${merchant.name} propose le produit ` +
              `« ${product.name} ».`,
          },
        ],
      };
    }

    if (theme.type === "service") {
      const service =
        services[theme.index % services.length];

      return {
        ...commonData,
        objective:
          `Présenter le service « ${service.name} »`,
        topic: service.name,
        caption:
          `Le service « ${service.name} » est disponible ` +
          `chez ${merchant.name} à ${merchant.city}.`,
        evidence: [
          {
            sourceType: "service" as const,
            sourceId: service.id,
            claim:
              `${merchant.name} dispose du service ` +
              `« ${service.name} ».`,
          },
        ],
      };
    }

    return {
      ...commonData,
      objective: "Présenter le commerce",
      topic: merchant.name,
      caption: merchant.description,
      evidence: [
        {
          sourceType: "merchant_profile" as const,
          sourceId: merchant.id,
          claim: merchant.description,
        },
      ],
    };
  });

  const weatherEnrichedDrafts =
    enrichDraftsWithWeather(
      drafts,
      weatherContexts,
    );

  return enrichDraftsWithCalendar(
    weatherEnrichedDrafts,
    calendarContexts,
  );
}
