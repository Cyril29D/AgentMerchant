import { createHash } from "node:crypto";

import { XMLParser } from "fast-xml-parser";

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  link: string;
  sourceName: string;
  publishedAt: string;
}

interface NewsSearchOptions {
  city: string;
  businessType: string;
  keywords: string[];
  lookbackDays?: number;
  maximumResults?: number;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === undefined || value === null) {
    return [];
  }

  return [value];
}

function readText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (isRecord(value)) {
    const text = value["#text"];

    if (typeof text === "string") {
      return text.trim();
    }
  }

  return "";
}

function decodeBasicEntities(
  value: string,
): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&nbsp;", " ");
}

function stripHtml(value: string): string {
  return decodeBasicEntities(
    value.replace(/<[^>]*>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function createArticleId(
  title: string,
  link: string,
  publishedAt: string,
): string {
  return createHash("sha256")
    .update(
      `${title}|${link}|${publishedAt}`,
    )
    .digest("hex")
    .slice(0, 16);
}

function quoteSearchTerm(
  value: string,
): string {
  const cleanedValue = value
    .replaceAll("\"", "")
    .trim();

  if (cleanedValue.includes(" ")) {
    return `"${cleanedValue}"`;
  }

  return cleanedValue;
}

function buildSearchQuery(
  city: string,
  businessType: string,
  keywords: string[],
  lookbackDays: number,
): string {
  const relevantTerms = [
    businessType,
    ...keywords,
  ]
    .filter(Boolean)
    .slice(0, 7)
    .map(quoteSearchTerm);

  const keywordQuery =
    relevantTerms.length > 0
      ? `(${relevantTerms.join(" OR ")})`
      : "";

  return [
    quoteSearchTerm(city),
    keywordQuery,
    `when:${lookbackDays}d`,
  ]
    .filter(Boolean)
    .join(" ");
}

async function fetchRss(
  url: string,
): Promise<string> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept:
        "application/rss+xml, application/xml, text/xml",
      "User-Agent":
        "AgentMerchant/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Le flux d’actualités a répondu avec le statut ${response.status}.`,
    );
  }

  return response.text();
}

export async function getNewsArticles({
  city,
  businessType,
  keywords,
  lookbackDays = 7,
  maximumResults = 20,
}: NewsSearchOptions): Promise<NewsArticle[]> {
  const query = buildSearchQuery(
    city,
    businessType,
    keywords,
    lookbackDays,
  );

  const parameters = new URLSearchParams({
    q: query,
    hl: "fr",
    gl: "FR",
    ceid: "FR:fr",
  });

  const rssContent = await fetchRss(
    `https://news.google.com/rss/search?${parameters.toString()}`,
  );

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@",
    textNodeName: "#text",
  });

  const parsedXml =
    parser.parse(rssContent) as unknown;

  if (!isRecord(parsedXml)) {
    throw new Error(
      "Le flux d’actualités possède un format invalide.",
    );
  }

  const rss = parsedXml.rss;

  if (!isRecord(rss)) {
    throw new Error(
      "Le flux RSS ne contient pas de balise rss.",
    );
  }

  const channel = rss.channel;

  if (!isRecord(channel)) {
    throw new Error(
      "Le flux RSS ne contient pas de canal.",
    );
  }

  const items = asArray(channel.item);

  return items
    .flatMap((rawItem): NewsArticle[] => {
      if (!isRecord(rawItem)) {
        return [];
      }

      const title = stripHtml(
        readText(rawItem.title),
      );

      const description = stripHtml(
        readText(rawItem.description),
      );

      const link = readText(rawItem.link);
      const publicationDate = readText(
        rawItem.pubDate,
      );

      const sourceName =
        readText(rawItem.source) ||
        "Source non précisée";

      const parsedDate = new Date(
        publicationDate,
      );

      if (
        !title ||
        !link ||
        Number.isNaN(parsedDate.getTime())
      ) {
        return [];
      }

      const publishedAt =
        parsedDate.toISOString();

      return [
        {
          id: `news-${createArticleId(
            title,
            link,
            publishedAt,
          )}`,
          title,
          description,
          link,
          sourceName,
          publishedAt,
        },
      ];
    })
    .sort(
      (firstArticle, secondArticle) =>
        new Date(
          secondArticle.publishedAt,
        ).getTime() -
        new Date(
          firstArticle.publishedAt,
        ).getTime(),
    )
    .slice(0, maximumResults);
}
