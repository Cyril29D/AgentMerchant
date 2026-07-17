import assert from "node:assert/strict";
import test from "node:test";

import { validatePost } from "../src/lib/agents/validator-agent.ts";

import type { ContentPost } from "../src/lib/schemas/content-plan.ts";
import type { Merchant } from "../src/lib/schemas/merchant.ts";
import type { Photo } from "../src/lib/schemas/photo.ts";

const merchant: Merchant = {
  id: "merchant-001",
  name: "Boulangerie Martin",
  businessType: "Boulangerie artisanale",
  city: "Montpellier",
  description:
    "Boulangerie artisanale située dans le centre de Montpellier.",
  tone: "chaleureux et professionnel",
  products: [
    {
      id: "product-croissant",
      name: "Croissants",
      verified: true,
    },
  ],
  services: [
    {
      id: "service-terrasse",
      name: "Terrasse",
      verified: true,
    },
  ],
  openingHours: {
    monday: "07:00-19:00",
    tuesday: "07:00-19:00",
    wednesday: "07:00-19:00",
    thursday: "07:00-19:00",
    friday: "07:00-19:00",
    saturday: "07:00-19:00",
    sunday: "closed",
  },
  promotions: [],
  events: [],
  forbiddenClaims: [],
};

const photos: Photo[] = [
  {
    id: "photo-001",
    filename: "croissants.jpg",
    path: "/merchant-photos/croissants.jpg",
    category: "product",
    description:
      "Plusieurs croissants dans une vitrine.",
    tags: ["croissants"],
  },
];

function createPost(
  overrides: Partial<
    Omit<ContentPost, "validation">
  > = {},
): Omit<ContentPost, "validation"> {
  return {
    day: 1,
    date: "2026-07-18",
    objective:
      "Mettre en avant le produit « Croissants »",
    topic: "Croissants",
    caption:
      "Boulangerie Martin présente ses croissants à Montpellier.",
    imageId: "photo-001",
    imagePath:
      "/merchant-photos/croissants.jpg",
    imageReason:
      "Le visuel correspond au produit.",
    context: [],
    evidence: [
      {
        sourceType: "product",
        sourceId: "product-croissant",
        claim:
          "Boulangerie Martin propose le produit « Croissants ».",
      },
      {
        sourceType: "photo",
        sourceId: "photo-001",
        claim:
          "Plusieurs croissants dans une vitrine.",
      },
    ],
    ...overrides,
  };
}

test(
  "approuve une publication fondée sur des données vérifiées",
  () => {
    const validation = validatePost(
      createPost(),
      merchant,
      photos,
    );

    assert.deepEqual(validation, {
      status: "approved",
      warnings: [],
    });
  },
);

test(
  "rejette les qualités et la variété non vérifiées",
  () => {
    const validation = validatePost(
      createPost({
        caption:
          "Des croissants frais et délicieux pour tous les goûts.",
      }),
      merchant,
      photos,
    );

    assert.equal(
      validation.status,
      "rejected",
    );
    assert.ok(
      validation.warnings.some((warning) =>
        warning.includes("fraîcheur"),
      ),
    );
    assert.ok(
      validation.warnings.some((warning) =>
        warning.includes("qualité gustative"),
      ),
    );
    assert.ok(
      validation.warnings.some((warning) =>
        warning.includes("variété de produits"),
      ),
    );
  },
);

test(
  "rejette une affirmation d’ouverture un jour fermé",
  () => {
    const validation = validatePost(
      createPost({
        date: "2026-07-19",
        caption:
          "La terrasse est ouverte ce dimanche.",
        evidence: [
          {
            sourceType: "service",
            sourceId: "service-terrasse",
            claim:
              "Boulangerie Martin dispose du service « Terrasse ».",
          },
        ],
      }),
      merchant,
      photos,
    );

    assert.equal(
      validation.status,
      "rejected",
    );
    assert.ok(
      validation.warnings.some((warning) =>
        warning.includes(
          "les horaires indiquent une fermeture",
        ),
      ),
    );
  },
);

test(
  "autorise la formule actualité locale sans allégation d’origine",
  () => {
    const validation = validatePost(
      createPost({
        caption:
          "Une actualité locale autour de la boulangerie.",
      }),
      merchant,
      photos,
    );

    assert.deepEqual(validation, {
      status: "approved",
      warnings: [],
    });
  },
);
