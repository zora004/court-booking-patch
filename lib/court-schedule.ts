import type { CourtRow } from "./db";

export const DEFAULT_SLOT_DURATION_MINUTES = 60;
export const SLOT_DURATION_STEP_MINUTES = 15;
export const MIN_SLOT_DURATION_MINUTES = 15;
export const MAX_SLOT_DURATION_MINUTES = 240;

export const BOOKING_DURATION_OPTIONS = Array.from(
  { length: MAX_SLOT_DURATION_MINUTES / SLOT_DURATION_STEP_MINUTES },
  (_, index) => (index + 1) * SLOT_DURATION_STEP_MINUTES
);

export const WEEKDAY_OPTIONS = [
  { value: 1, label: "Monday", shortLabel: "Mon" },
  { value: 2, label: "Tuesday", shortLabel: "Tue" },
  { value: 3, label: "Wednesday", shortLabel: "Wed" },
  { value: 4, label: "Thursday", shortLabel: "Thu" },
  { value: 5, label: "Friday", shortLabel: "Fri" },
  { value: 6, label: "Saturday", shortLabel: "Sat" },
  { value: 0, label: "Sunday", shortLabel: "Sun" },
] as const;

export const DEFAULT_OPEN_DAYS = WEEKDAY_OPTIONS.map((day) => day.value);

const WEEKDAY_ORDER: Map<number, number> = new Map(
  WEEKDAY_OPTIONS.map((day, index) => [day.value, index])
);

export interface ApiCourtData extends Omit<CourtRow, "openDays"> {
  openDays: number[];
}

export function isValidSlotDurationMinutes(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_SLOT_DURATION_MINUTES &&
    value <= MAX_SLOT_DURATION_MINUTES &&
    value % SLOT_DURATION_STEP_MINUTES === 0
  );
}

export function normalizeSlotDurationMinutes(value: unknown): number {
  return isValidSlotDurationMinutes(value) ? value : DEFAULT_SLOT_DURATION_MINUTES;
}

export function isValidOpenDays(value: unknown): value is number[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > WEEKDAY_OPTIONS.length) {
    return false;
  }

  const seen = new Set<number>();
  return value.every((day) => {
    if (!Number.isInteger(day) || !WEEKDAY_ORDER.has(day) || seen.has(day)) return false;
    seen.add(day);
    return true;
  });
}

export function normalizeOpenDays(value: unknown): number[] {
  if (!isValidOpenDays(value)) return [...DEFAULT_OPEN_DAYS];
  return [...value].sort((a, b) => (WEEKDAY_ORDER.get(a) ?? 0) - (WEEKDAY_ORDER.get(b) ?? 0));
}

export function parseOpenDays(value: unknown): number[] {
  if (Array.isArray(value)) return normalizeOpenDays(value);
  if (typeof value !== "string") return [...DEFAULT_OPEN_DAYS];

  try {
    return normalizeOpenDays(JSON.parse(value));
  } catch {
    return [...DEFAULT_OPEN_DAYS];
  }
}

export function openDaysToDb(value: unknown): string {
  return JSON.stringify(normalizeOpenDays(value));
}

export function formatOpenDays(value: unknown): string {
  const days = normalizeOpenDays(value);
  const key = days.join(",");
  if (key === DEFAULT_OPEN_DAYS.join(",")) return "Daily";
  if (key === "1,2,3,4,5") return "Mon-Fri";
  if (key === "6,0") return "Sat-Sun";

  const labels = days.map((day) => WEEKDAY_OPTIONS.find((option) => option.value === day)?.shortLabel);
  return labels.filter(Boolean).join(", ");
}

export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes % 60 === 0) return `${minutes / 60} hr${minutes === 60 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} hr ${remainingMinutes} min`;
}

export function formatPrice(value: number | null | undefined): string {
  const numeric = Number(value ?? 0);
  return `$${numeric.toFixed(2)}`;
}

export function getWeekdayFromDateString(date: string): number {
  return new Date(`${date}T00:00:00`).getDay();
}

export function isCourtOpenOnDate(openDays: unknown, date: string): boolean {
  return normalizeOpenDays(openDays).includes(getWeekdayFromDateString(date));
}

export function serializeCourt(row: CourtRow): ApiCourtData {
  return {
    ...row,
    slotDurationMinutes: normalizeSlotDurationMinutes(row.slotDurationMinutes),
    openDays: parseOpenDays(row.openDays),
  };
}
