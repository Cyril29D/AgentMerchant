import type { Evidence } from "@/lib/schemas/content-plan";
import type { Merchant } from "@/lib/schemas/merchant";
import type { WeatherDay } from "@/lib/services/weather-service";

export type WeatherContextKind =
  | "rain"
  | "heat"
  | "cold"
  | "outdoor";

export interface WeatherContext {
  date: string;
  kind: WeatherContextKind;
  summary: string;
  captionLead: string;
  evidence: Evidence;
}

const RAIN_CODES = new Set([
  51, 53, 55, 56, 57,
  61, 63, 65, 66, 67,
  80, 81, 82,
  95, 96, 99,
]);

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR");
}

function hasVerifiedTerrace(merchant: Merchant): boolean {
  return merchant.services.some(
    (service) =>
      service.verified &&
      normalize(service.name).includes("terrasse"),
  );
}

function createWeatherEvidence(
  weather: WeatherDay,
  claim: string,
): Evidence {
  return {
    sourceType: "weather",
    sourceId: weather.sourceId,
    claim,
  };
}

export function buildWeatherContexts(
  merchant: Merchant,
  weatherDays: WeatherDay[],
): WeatherContext[] {
  const terraceAvailable =
    hasVerifiedTerrace(merchant);

  return weatherDays.flatMap<WeatherContext>((weather) => {
    const isRainy =
      weather.precipitationProbability >= 50 ||
      RAIN_CODES.has(weather.weatherCode);

    if (isRainy) {
      const claim =
        `${weather.weatherLabel} prévue le ${weather.date} ` +
        `avec ${weather.precipitationProbability} % de risque de précipitations.`;

      return [
        {
          date: weather.date,
          kind: "rain" as const,
          summary: claim,
          captionLead:
            `Un risque de pluie de ` +
            `${weather.precipitationProbability} % est prévu à ` +
            `${merchant.city}.`,
          evidence: createWeatherEvidence(
            weather,
            claim,
          ),
        },
      ];
    }

    if (weather.maximumTemperature >= 30) {
      const claim =
        `Une température maximale de ` +
        `${weather.maximumTemperature} °C est prévue le ${weather.date}.`;

      return [
        {
          date: weather.date,
          kind: "heat" as const,
          summary: claim,
          captionLead:
            `Des températures élevées sont prévues à ` +
            `${merchant.city}, avec jusqu’à ` +
            `${weather.maximumTemperature} °C.`,
          evidence: createWeatherEvidence(
            weather,
            claim,
          ),
        },
      ];
    }

    if (weather.maximumTemperature <= 8) {
      const claim =
        `Une température maximale de ` +
        `${weather.maximumTemperature} °C est prévue le ${weather.date}.`;

      return [
        {
          date: weather.date,
          kind: "cold" as const,
          summary: claim,
          captionLead:
            `Une journée fraîche est prévue à ` +
            `${merchant.city}, avec une température maximale de ` +
            `${weather.maximumTemperature} °C.`,
          evidence: createWeatherEvidence(
            weather,
            claim,
          ),
        },
      ];
    }

    const outdoorConditionsAreUseful =
      terraceAvailable &&
      weather.precipitationProbability <= 20 &&
      weather.maximumTemperature >= 12 &&
      weather.maximumTemperature < 30;

    if (outdoorConditionsAreUseful) {
      const claim =
        `Des conditions sèches sont prévues le ${weather.date}, ` +
        `avec ${weather.precipitationProbability} % de risque de précipitations.`;

      return [
        {
          date: weather.date,
          kind: "outdoor" as const,
          summary: claim,
          captionLead:
            `Des conditions sèches sont prévues à ` +
            `${merchant.city}.`,
          evidence: createWeatherEvidence(
            weather,
            claim,
          ),
        },
      ];
    }

    return [];
  });
}
