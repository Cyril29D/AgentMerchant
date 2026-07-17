import type {
  ContentPost,
  Validation,
} from "@/lib/schemas/content-plan";
import type { Merchant } from "@/lib/schemas/merchant";
import type { Photo } from "@/lib/schemas/photo";

function containsPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function normalizeText(
  value: string,
): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR");
}

interface RiskyClaim {
  label: string;
  pattern: RegExp;
}

const RISKY_CLAIMS: RiskyClaim[] = [
  {
    label: "fait maison",
    pattern:
      /\bfait(?:e|s)? maison\b/,
  },
  {
    label: "préparation du jour",
    pattern:
      /\bprepare(?:e|es|s)? (?:ce matin|aujourd hui|sur place)\b/,
  },
  {
    label: "fraîcheur",
    pattern:
      /\b(?:frais|fraiche|fraiches)\b/,
  },
  {
    label: "qualité gustative",
    pattern:
      /\b(?:delicieux|delicieuse|delicieuses|savoureux|savoureuse|gourmand|gourmande)\b/,
  },
  {
    label: "confort",
    pattern:
      /\b(?:confortable|confortables)\b/,
  },
  {
    label: "expérience unique",
    pattern:
      /\b(?:experience unique|shopping unique)\b/,
  },
  {
    label: "variété de produits",
    pattern:
      /\b(?:pour tous les gouts|large choix|grand choix|vaste choix|grande variete)\b/,
  },
  {
    label: "produit biologique",
    pattern:
      /\bbio(?:logique)?\b/,
  },
  {
    label: "sans gluten",
    pattern:
      /\bsans gluten\b/,
  },
  {
    label: "origine locale",
    pattern:
      /\b(?:produit(?:s)? local(?:e|es|aux)?|ingredient(?:s)? local(?:e|es|aux)?|origine locale|fabrication locale|circuit court)\b/,
  },
  {
    label: "produit végan",
    pattern:
      /\bvegan(?:e|es|s)?\b/,
  },
  {
    label: "certification halal",
    pattern:
      /\bhalal\b/,
  },
];

function isMerchantOpenOnDate(
  merchant: Merchant,
  date: string,
): boolean {
  const parsedDate = new Date(
    `${date}T12:00:00`,
  );

  if (
    Number.isNaN(parsedDate.getTime())
  ) {
    return false;
  }

  const openingHoursKeys = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  const openingHoursKey =
    openingHoursKeys[
      parsedDate.getDay()
    ];

  if (!openingHoursKey) {
    return false;
  }

  const openingHours =
    merchant.openingHours[
      openingHoursKey
    ];

  if (!openingHours) {
    return false;
  }

  const normalizedOpeningHours =
    normalizeText(openingHours);

  return ![
    "closed",
    "ferme",
    "fermee",
  ].includes(
    normalizedOpeningHours,
  );
}

export function validatePost(
  post: Omit<ContentPost, "validation">,
  merchant: Merchant,
  photos: Photo[],
): Validation {
  const warnings: string[] = [];
  const normalizedCaption = post.caption.toLocaleLowerCase("fr-FR");

  const normalizedVerifiedFacts =
    normalizeText(
      [
        merchant.name,
        merchant.businessType,
        merchant.city,
        merchant.description,

        ...merchant.products
          .filter(
            (product) =>
              product.verified,
          )
          .map(
            (product) =>
              product.name,
          ),

        ...merchant.services
          .filter(
            (service) =>
              service.verified,
          )
          .map(
            (service) =>
              service.name,
          ),

        ...merchant.promotions
          .filter(
            (promotion) =>
              promotion.verified,
          )
          .flatMap(
            (promotion) => [
              promotion.title,
              promotion.description,
            ],
          ),

        ...merchant.events
          .filter(
            (event) => event.verified,
          )
          .flatMap(
            (event) => [
              event.title,
              event.description,
            ],
          ),
      ].join(" "),
    );

  const normalizedGeneratedCaption =
    normalizeText(post.caption);

  const claimsThatCommerceIsOpen =
    /\b(?:ouvert|ouverte|ouverts|ouvertes)\b/.test(
      normalizedGeneratedCaption,
    );

  if (
    claimsThatCommerceIsOpen &&
    !isMerchantOpenOnDate(
      merchant,
      post.date,
    )
  ) {
    warnings.push(
      "La publication affirme que le commerce ou un service est ouvert alors que les horaires indiquent une fermeture.",
    );
  }

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

  for (const riskyClaim of RISKY_CLAIMS) {
    const claimAppearsInCaption =
      riskyClaim.pattern.test(
        normalizedGeneratedCaption,
      );

    const claimExistsInFacts =
      riskyClaim.pattern.test(
        normalizedVerifiedFacts,
      );

    if (
      claimAppearsInCaption &&
      !claimExistsInFacts
    ) {
      warnings.push(
        `La publication contient une affirmation non vérifiée : ${riskyClaim.label}.`,
      );
    }
  }

  const containsPrice =
    /\b\d+(?:[.,]\d{1,2})?\s?€\b/.test(
      post.caption,
    );

  const verifiedFactsContainPrice =
    /\b\d+(?:[.,]\d{1,2})?\s?€\b/.test(
      normalizedVerifiedFacts,
    );

  if (
    containsPrice &&
    !verifiedFactsContainPrice
  ) {
    warnings.push(
      "La publication contient un prix qui n’est pas présent dans les données vérifiées.",
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
    if (
      evidence.sourceType === "news" &&
      (
        !evidence.sourceUrl ||
        !evidence.sourceName ||
        !evidence.publishedAt
      )
    ) {
      warnings.push(
        "Une actualité utilisée ne possède pas toutes ses informations de traçabilité.",
      );
    }

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
