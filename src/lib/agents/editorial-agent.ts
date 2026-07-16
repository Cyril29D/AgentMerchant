import { addDays, format } from "date-fns";

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

function lowerFirst(value: string): string {
  if (!value) {
    return value;
  }

  return value.charAt(0).toLocaleLowerCase("fr-FR") + value.slice(1);
}

export function buildEditorialDrafts(
  merchant: Merchant,
  startDate: Date,
): EditorialDraft[] {
  const products = merchant.products.filter((product) => product.verified);
  const services = merchant.services.filter((service) => service.verified);

  if (products.length === 0 && services.length === 0) {
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

  return themes.map((theme, index) => {
    const commonData = {
      day: index + 1,
      date: format(addDays(startDate, index), "yyyy-MM-dd"),
      context: [],
    };

    if (theme.type === "product") {
      const product = products[theme.index % products.length];

      return {
        ...commonData,
        objective: `Mettre en avant le produit « ${product.name} »`,
        topic: product.name,
        caption:
          `Aujourd’hui, ${merchant.name} met en avant ` +
          `${lowerFirst(product.name)}. Retrouvez ce produit à ${merchant.city}.`,
        evidence: [
          {
            sourceType: "product",
            sourceId: product.id,
            claim: `${merchant.name} propose le produit « ${product.name} ».`,
          },
        ],
      };
    }

    if (theme.type === "service") {
      const service = services[theme.index % services.length];

      return {
        ...commonData,
        objective: `Présenter le service « ${service.name} »`,
        topic: service.name,
        caption:
          `Le service « ${service.name} » est disponible chez ` +
          `${merchant.name} à ${merchant.city}.`,
        evidence: [
          {
            sourceType: "service",
            sourceId: service.id,
            claim: `${merchant.name} dispose du service « ${service.name} ».`,
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
          sourceType: "merchant_profile",
          sourceId: merchant.id,
          claim: merchant.description,
        },
      ],
    };
  });
}
