import { addDays, format } from "date-fns";
import { z } from "zod";

const GeocodingResponseSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country: z.string().optional(),
        timezone: z.string().optional(),
      }),
    )
    .optional(),
});

const ForecastResponseSchema = z.object({
  timezone: z.string(),
  daily: z.object({
    time: z.array(z.string()),
    weather_code: z.array(z.number()),
    temperature_2m_max: z.array(z.number()),
    temperature_2m_min: z.array(z.number()),
    precipitation_probability_max: z.array(
      z.number().nullable(),
    ),
    wind_speed_10m_max: z.array(z.number()),
  }),
});

export interface WeatherDay {
  date: string;
  weatherCode: number;
  weatherLabel: string;
  minimumTemperature: number;
  maximumTemperature: number;
  precipitationProbability: number;
  maximumWindSpeed: number;
  sourceId: string;
}

export interface WeatherForecast {
  location: {
    name: string;
    country: string | null;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  days: WeatherDay[];
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Open-Meteo a répondu avec le statut ${response.status}.`,
    );
  }

  return response.json() as Promise<unknown>;
}

function describeWeatherCode(code: number): string {
  if (code === 0) {
    return "Ciel dégagé";
  }

  if ([1, 2].includes(code)) {
    return "Temps partiellement nuageux";
  }

  if (code === 3) {
    return "Temps couvert";
  }

  if ([45, 48].includes(code)) {
    return "Brouillard";
  }

  if ([51, 53, 55, 56, 57].includes(code)) {
    return "Bruine";
  }

  if ([61, 63, 65, 66, 67].includes(code)) {
    return "Pluie";
  }

  if ([71, 73, 75, 77].includes(code)) {
    return "Neige";
  }

  if ([80, 81, 82].includes(code)) {
    return "Averses";
  }

  if ([85, 86].includes(code)) {
    return "Averses de neige";
  }

  if ([95, 96, 99].includes(code)) {
    return "Orage";
  }

  return "Conditions variables";
}

function roundValue(value: number): number {
  return Math.round(value * 10) / 10;
}

export async function getWeatherForecast(
  city: string,
  startDate: Date,
  numberOfDays = 5,
): Promise<WeatherForecast> {
  const geocodingParameters = new URLSearchParams({
    name: city,
    count: "5",
    language: "fr",
    format: "json",
  });

  const rawGeocoding = await fetchJson(
    `https://geocoding-api.open-meteo.com/v1/search?${geocodingParameters}`,
  );

  const geocoding =
    GeocodingResponseSchema.parse(rawGeocoding);

  const location = geocoding.results?.[0];

  if (!location) {
    throw new Error(
      `Aucune localisation trouvée pour la ville « ${city} ».`,
    );
  }

  const endDate = addDays(startDate, numberOfDays - 1);

  const forecastParameters = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
      "wind_speed_10m_max",
    ].join(","),
    timezone: "auto",
    start_date: format(startDate, "yyyy-MM-dd"),
    end_date: format(endDate, "yyyy-MM-dd"),
  });

  const rawForecast = await fetchJson(
    `https://api.open-meteo.com/v1/forecast?${forecastParameters}`,
  );

  const forecast =
    ForecastResponseSchema.parse(rawForecast);

  const days: WeatherDay[] = forecast.daily.time.map(
    (date, index) => {
      const weatherCode =
        forecast.daily.weather_code[index];
      const minimumTemperature =
        forecast.daily.temperature_2m_min[index];
      const maximumTemperature =
        forecast.daily.temperature_2m_max[index];
      const precipitationProbability =
        forecast.daily.precipitation_probability_max[index];
      const maximumWindSpeed =
        forecast.daily.wind_speed_10m_max[index];

      if (
        weatherCode === undefined ||
        minimumTemperature === undefined ||
        maximumTemperature === undefined ||
        maximumWindSpeed === undefined
      ) {
        throw new Error(
          `Les données météo du ${date} sont incomplètes.`,
        );
      }

      return {
        date,
        weatherCode,
        weatherLabel: describeWeatherCode(weatherCode),
        minimumTemperature: roundValue(
          minimumTemperature,
        ),
        maximumTemperature: roundValue(
          maximumTemperature,
        ),
        precipitationProbability:
          precipitationProbability ?? 0,
        maximumWindSpeed: roundValue(
          maximumWindSpeed,
        ),
        sourceId: `weather-${date}`,
      };
    },
  );

  return {
    location: {
      name: location.name,
      country: location.country ?? null,
      latitude: location.latitude,
      longitude: location.longitude,
      timezone:
        location.timezone ?? forecast.timezone,
    },
    days,
  };
}
