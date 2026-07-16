import type { Evidence } from "@/lib/schemas/content-plan";
import type { Merchant } from "@/lib/schemas/merchant";
import type { NewsArticle } from "@/lib/services/news-service";

export interface NewsContext {
  articleId: string;
  summary: string;
  captionLead: string;
  relevantTerms: string[];
  score: number;
  evidence: Evidence;
}

interface WeightedKeyword {
  term: string;
  label: string;
  weight: number;
}

const STOP_WORDS = new Set([
  "artisanale",
  "artisanal",
  "commerce",
  "service",
  "produit",
  "centre",
  "chez",
  "avec",
  "dans",
  "pour",
  "située",
  "situee",
  "disponible",
]);

const REJECTED_NEWS_TERMS = [
  "meurtre",
  "agression",
  "accident",
  "incendie",
  "décès",
  "deces",
  "mort",
  "procès",
  "proces",
  "guerre",
  "élection",
  "election",
  "politique",
  "police",
  "justice",
  "trafic de drogue",
  "violence",
  "braquage",
];

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTerms(
  value: string,
): string[] {
  return normalize(value)
    .split(/\s+/)
    .filter((term) => term.length >= 4)
    .filter(
      (term) => !STOP_WORDS.has(term),
    );
}

function addWeightedTerms(
  collection: Map<string, WeightedKeyword>,
  value: string,
  weight: number,
): void {
  const normalizedValue = normalize(value);

  if (
    normalizedValue.length >= 4 &&
    !STOP_WORDS.has(normalizedValue)
  ) {
    collection.set(normalizedValue, {
      term: normalizedValue,
      label: value,
      weight,
    });
  }

  for (const term of extractTerms(value)) {
    const existingTerm =
      collection.get(term);

    if (
      !existingTerm ||
      existingTerm.weight < weight
    ) {
      collection.set(term, {
        term,
        label: term,
        weight,
      });
    }
  }
}

function getMerchantKeywords(
  merchant: Merchant,
): WeightedKeyword[] {
  const keywords = new Map<
    string,
    WeightedKeyword
  >();

  addWeightedTerms(
    keywords,
    merchant.businessType,
    3,
  );

  for (const product of merchant.products) {
    if (product.verified) {
      addWeightedTerms(
        keywords,
        product.name,
        5,
      );
    }
  }

  for (const service of merchant.services) {
    if (service.verified) {
      addWeightedTerms(
        keywords,
        service.name,
        4,
      );
    }
  }

  return [...keywords.values()];
}

function containsRejectedSubject(
  articleText: string,
): boolean {
  return REJECTED_NEWS_TERMS.some(
    (term) =>
      articleText.includes(
        normalize(term),
      ),
  );
}

function formatPublishedDate(
  publishedAt: string,
): string {
  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "medium",
      timeZone: "Europe/Paris",
    },
  ).format(new Date(publishedAt));
}

export function buildNewsContexts(
  merchant: Merchant,
  articles: NewsArticle[],
): NewsContext[] {
  const merchantKeywords =
    getMerchantKeywords(merchant);

  const normalizedCity = normalize(
    merchant.city,
  );

  return articles
    .flatMap((article): NewsContext[] => {
      const articleText = normalize(
        `${article.title} ${article.description}`,
      );

      /*
       * L’article doit être clairement local.
       */
      if (
        !articleText.includes(
          normalizedCity,
        )
      ) {
        return [];
      }

      /*
       * Les faits divers et sujets sensibles
       * sont volontairement exclus.
       */
      if (
        containsRejectedSubject(
          articleText,
        )
      ) {
        return [];
      }

      const matchingKeywords =
        merchantKeywords.filter(
          (keyword) =>
            articleText.includes(
              keyword.term,
            ),
        );

      if (matchingKeywords.length === 0) {
        return [];
      }

      const uniqueLabels = [
        ...new Set(
          matchingKeywords.map(
            (keyword) => keyword.label,
          ),
        ),
      ];

      const score =
        3 +
        matchingKeywords.reduce(
          (total, keyword) =>
            total + keyword.weight,
          0,
        );

      const mainTerm =
        uniqueLabels[0] ??
        merchant.businessType;

      const publicationDate =
        formatPublishedDate(
          article.publishedAt,
        );

      const claim =
        `L’article « ${article.title} » a été publié ` +
        `par ${article.sourceName} le ${publicationDate}.`;

      return [
        {
          articleId: article.id,
          summary: claim,
          captionLead:
            `Le thème « ${mainTerm} » apparaît ` +
            `dans l’actualité locale.`,
          relevantTerms: uniqueLabels,
          score,
          evidence: {
            sourceType: "news",
            sourceId: article.id,
            claim,
            sourceName:
              article.sourceName,
            sourceUrl: article.link,
            publishedAt:
              article.publishedAt,
          },
        },
      ];
    })
    .sort(
      (firstContext, secondContext) =>
        secondContext.score -
        firstContext.score,
    )
    .slice(0, 3);
}
