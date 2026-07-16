import {
  addDays,
  format,
  getDay,
  getMonth,
} from "date-fns";

export type Season =
  | "winter"
  | "spring"
  | "summer"
  | "autumn";

export type OpeningHoursKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface CalendarDay {
  date: string;
  dayName: string;
  openingHoursKey: OpeningHoursKey;
  isWeekend: boolean;
  holiday: string | null;
  season: Season;
  seasonLabel: string;
  sourceId: string;
}

const DAY_INFORMATION: Record<
  number,
  {
    name: string;
    openingHoursKey: OpeningHoursKey;
  }
> = {
  0: {
    name: "dimanche",
    openingHoursKey: "sunday",
  },
  1: {
    name: "lundi",
    openingHoursKey: "monday",
  },
  2: {
    name: "mardi",
    openingHoursKey: "tuesday",
  },
  3: {
    name: "mercredi",
    openingHoursKey: "wednesday",
  },
  4: {
    name: "jeudi",
    openingHoursKey: "thursday",
  },
  5: {
    name: "vendredi",
    openingHoursKey: "friday",
  },
  6: {
    name: "samedi",
    openingHoursKey: "saturday",
  },
};

const SEASON_LABELS: Record<Season, string> = {
  winter: "hiver",
  spring: "printemps",
  summer: "été",
  autumn: "automne",
};

function getSeason(date: Date): Season {
  const month = getMonth(date);

  if ([11, 0, 1].includes(month)) {
    return "winter";
  }

  if ([2, 3, 4].includes(month)) {
    return "spring";
  }

  if ([5, 6, 7].includes(month)) {
    return "summer";
  }

  return "autumn";
}

function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h =
    (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l =
    (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor(
    (a + 11 * h + 22 * l) / 451,
  );

  const month = Math.floor(
    (h + l - 7 * m + 114) / 31,
  );

  const day =
    ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0,
  );
}

function buildFrenchHolidayMap(
  year: number,
): Map<string, string> {
  const holidays = new Map<string, string>();

  function addHoliday(
    date: Date,
    name: string,
  ): void {
    holidays.set(
      format(date, "yyyy-MM-dd"),
      name,
    );
  }

  addHoliday(
    new Date(year, 0, 1, 12),
    "Jour de l’An",
  );

  addHoliday(
    new Date(year, 4, 1, 12),
    "Fête du Travail",
  );

  addHoliday(
    new Date(year, 4, 8, 12),
    "Victoire du 8 mai 1945",
  );

  addHoliday(
    new Date(year, 6, 14, 12),
    "Fête nationale",
  );

  addHoliday(
    new Date(year, 7, 15, 12),
    "Assomption",
  );

  addHoliday(
    new Date(year, 10, 1, 12),
    "Toussaint",
  );

  addHoliday(
    new Date(year, 10, 11, 12),
    "Armistice",
  );

  addHoliday(
    new Date(year, 11, 25, 12),
    "Noël",
  );

  const easterSunday =
    getEasterSunday(year);

  addHoliday(
    addDays(easterSunday, 1),
    "Lundi de Pâques",
  );

  addHoliday(
    addDays(easterSunday, 39),
    "Ascension",
  );

  addHoliday(
    addDays(easterSunday, 50),
    "Lundi de Pentecôte",
  );

  return holidays;
}

export function getCalendarDays(
  startDate: Date,
  numberOfDays = 5,
): CalendarDay[] {
  const holidayMaps = new Map<
    number,
    Map<string, string>
  >();

  const days: CalendarDay[] = [];

  for (
    let index = 0;
    index < numberOfDays;
    index += 1
  ) {
    const date = addDays(startDate, index);
    const dateString = format(
      date,
      "yyyy-MM-dd",
    );

    const year = date.getFullYear();

    if (!holidayMaps.has(year)) {
      holidayMaps.set(
        year,
        buildFrenchHolidayMap(year),
      );
    }

    const dayInformation =
      DAY_INFORMATION[getDay(date)];

    if (!dayInformation) {
      throw new Error(
        `Impossible de déterminer le jour pour ${dateString}.`,
      );
    }

    const season = getSeason(date);
    const holidayMap =
      holidayMaps.get(year);

    days.push({
      date: dateString,
      dayName: dayInformation.name,
      openingHoursKey:
        dayInformation.openingHoursKey,
      isWeekend:
        dayInformation.openingHoursKey ===
          "saturday" ||
        dayInformation.openingHoursKey ===
          "sunday",
      holiday:
        holidayMap?.get(dateString) ?? null,
      season,
      seasonLabel: SEASON_LABELS[season],
      sourceId: `calendar-${dateString}`,
    });
  }

  return days;
}

