import type {
  ContentPost,
  Validation,
} from "@/lib/schemas/content-plan";
import type { Merchant } from "@/lib/schemas/merchant";
import type { Photo } from "@/lib/schemas/photo";

function containsPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function validatePost(
  post: Omit<ContentPost, "validation">,
  merchant: Merchant,
  photos: Photo[],
): Validation {
  const warnings: string[] = [];
  const normalizedCaption = post.caption.toLocaleLowerCase("fr-FR");

  const hasVerifiedPromotion = merchant.promotions.some(
    (promotion) => promotion.verified,
  );

  const hasVerifiedEvent = merchant.events.some((event) => event.verified);

  const hasVerifiedDelivery = merchant.services.some(
    (service) =>
      service.verified &&
      service.name.toLocaleLowerCase("fr-FR").includes("livraison"),
  );

  if (
    !hasVerifiedPromotion &&
    containsPattern(normalizedCaption, [
      /\bpromotion\b/,
      /\bpromo\b/,
      /\bréduction\b/,
      /\boffre spéciale\b/,
      /\bgratuit(?:e)?\b/,
      /\b\d+\s?%\b/,
    ])
  ) {
    warnings.push(
      "La publication contient une promotion qui n’est pas vérifiée.",
    );
  }

  if (
    !hasVerifiedEvent &&
    containsPattern(normalizedCaption, [
      /\bévénement\b/,
      /\bsoirée\b/,
      /\bconcert\b/,
      /\batelier\b/,
    ])
  ) {
    warnings.push(
      "La publication mentionne un événement qui n’est pas vérifié.",
    );
  }

  if (!hasVerifiedDelivery && /\blivraison\b/.test(normalizedCaption)) {
    warnings.push(
      "La publication mentionne un service de livraison non vérifié.",
    );
  }

  const allowedEvidenceIds = new Set([
    merchant.id,
    ...merchant.products
      .filter((product) => product.verified)
      .map((product) => product.id),
    ...merchant.services
      .filter((service) => service.verified)
      .map((service) => service.id),
    ...merchant.promotions
      .filter((promotion) => promotion.verified)
      .map((promotion) => promotion.id),
    ...merchant.events
      .filter((event) => event.verified)
      .map((event) => event.id),
    ...photos.map((photo) => photo.id),
  ]);

  for (const evidence of post.evidence) {
    const externalSource = [
      "weather",
      "news",
      "season",
    ].includes(evidence.sourceType);

    if (!externalSource && !allowedEvidenceIds.has(evidence.sourceId)) {
      warnings.push(
        `La preuve « ${evidence.sourceId} » ne correspond pas à une donnée vérifiée.`,
      );
    }
  }

  if (post.evidence.length === 0) {
    warnings.push(
      "La publication ne possède aucune preuve permettant de vérifier ses affirmations.",
    );
  }

  return {
    status: warnings.length === 0 ? "approved" : "rejected",
    warnings,
  };
}
