import type { Evidence } from "@/lib/schemas/content-plan";
import type { Merchant } from "@/lib/schemas/merchant";
import type {
  CalendarDay,
  Season,
} from "@/lib/services/calendar-service";

export type CalendarContextKind =
  | "holiday"
  | "weekend"
  | "season";

export interface CalendarContext {
  date: string;
  kind: CalendarContextKind;
  summary: string;
  captionLead: string;
  evidence: Evidence;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR");
}

function isMerchantOpen(
  merchant: Merchant,
  calendarDay: CalendarDay,
): boolean {
  const openingHours =
    merchant.openingHours[
      calendarDay.openingHoursKey
    ];

  if (!openingHours) {
    return false;
  }

  const normalizedHours =
    normalize(openingHours);

  return ![
    "closed",
    "ferme",
    "fermee",
  ].includes(normalizedHours);
}

function hasVerifiedTerrace(
  merchant: Merchant,
): boolean {
  return merchant.services.some(
    (service) =>
      service.verified &&
      normalize(service.name).includes(
        "terrasse",
      ),
  );
}

function getSeasonSummary(
  season: Season,
  date: string,
): string {
  const labels: Record<Season, string> = {
    winter: "La période hivernale",
    spring: "La période printanière",
    summer: "La période estivale",
    autumn: "La période automnale",
  };

  return `${labels[season]} est en cours le ${date}.`;
}

function getSeasonCaptionLead(
  season: Season,
): string {
  const captions: Record<Season, string> = {
    winter: "En cette période hivernale,",
    spring: "Avec l’arrivée des beaux jours,",
    summer: "En cette période estivale,",
    autumn: "En cette période automnale,",
  };

  return captions[season];
}

function createEvidence(
  calendarDay: CalendarDay,
  claim: string,
): Evidence {
  return {
    sourceType: "season",
    sourceId: calendarDay.sourceId,
    claim,
  };
}

export function buildCalendarContexts(
  merchant: Merchant,
  calendarDays: CalendarDay[],
): CalendarContext[] {
  const contexts: CalendarContext[] = [];
  const terraceAvailable =
    hasVerifiedTerrace(merchant);

  for (const calendarDay of calendarDays) {
    if (calendarDay.holiday) {
      const claim =
        `${calendarDay.holiday} a lieu ` +
        `le ${calendarDay.date}.`;

      contexts.push({
        date: calendarDay.date,
        kind: "holiday",
        summary: claim,
        captionLead:
          `À l’occasion de ${calendarDay.holiday},`,
        evidence: createEvidence(
          calendarDay,
          claim,
        ),
      });
    }

    if (
      calendarDay.isWeekend &&
      isMerchantOpen(merchant, calendarDay)
    ) {
      const claim =
        `${calendarDay.date} est un ` +
        `${calendarDay.dayName} et le commerce ` +
        `est déclaré ouvert ce jour-là.`;

      contexts.push({
        date: calendarDay.date,
        kind: "weekend",
        summary: claim,
        captionLead:
          `Le week-end commence à ${merchant.city}.`,
        evidence: createEvidence(
          calendarDay,
          claim,
        ),
      });
    }

    const outdoorSeason =
      calendarDay.season === "spring" ||
      calendarDay.season === "summer";

    if (
      terraceAvailable &&
      outdoorSeason
    ) {
      const claim = getSeasonSummary(
        calendarDay.season,
        calendarDay.date,
      );

      contexts.push({
        date: calendarDay.date,
        kind: "season",
        summary: claim,
        captionLead: getSeasonCaptionLead(
          calendarDay.season,
        ),
        evidence: createEvidence(
          calendarDay,
          claim,
        ),
      });
    }
  }

  return contexts;
}
