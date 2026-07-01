import type { BookingRow, CourtRow } from "./db";
import {
  isCourtOpenOnDate,
  normalizeSlotDurationMinutes,
  parseOpenDays,
} from "./court-schedule";

/** "HH:MM" -> minutes since midnight */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** minutes since midnight -> "HH:MM" */
export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function rangesOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && endA > startB;
}

export interface SlotInfo {
  startTime: string;
  endTime: string;
  available: boolean;
}

/**
 * Generate slots between a court's opening/closing time for a given date,
 * marking each as available/unavailable based on existing confirmed bookings,
 * court open days, and whether the slot is already in the past.
 */
export function generateSlotsForDate(
  court: Pick<CourtRow, "openingTime" | "closingTime" | "slotDurationMinutes" | "openDays">,
  date: string,
  confirmedBookings: Pick<BookingRow, "startTime" | "endTime">[]
): SlotInfo[] {
  const openDays = parseOpenDays(court.openDays);
  if (!isCourtOpenOnDate(openDays, date)) return [];

  const open = timeToMinutes(court.openingTime);
  const close = timeToMinutes(court.closingTime);
  const slotDurationMinutes = normalizeSlotDurationMinutes(court.slotDurationMinutes);
  const bookedRanges = confirmedBookings.map((booking) => ({
    start: timeToMinutes(booking.startTime),
    end: timeToMinutes(booking.endTime),
  }));

  const now = new Date();
  const todayStr = formatDate(now);
  const isToday = date === todayStr;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const slots: SlotInfo[] = [];
  for (let start = open; start + slotDurationMinutes <= close; start += slotDurationMinutes) {
    const startTime = minutesToTime(start);
    const endTime = minutesToTime(start + slotDurationMinutes);
    const isPast = isToday && start <= nowMinutes;
    const isBooked = bookedRanges.some((booking) =>
      rangesOverlap(start, start + slotDurationMinutes, booking.start, booking.end)
    );
    slots.push({
      startTime,
      endTime,
      available: !isBooked && !isPast,
    });
  }
  return slots;
}

export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDisplayDate(dateStr: string): string {
  if (!isValidDateString(dateStr)) return dateStr;
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export function formatDisplayTime(timeStr: string): string {
  if (!isValidTimeString(timeStr)) return timeStr;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return new Date(Date.UTC(2000, 0, 1, hours, minutes)).toLocaleTimeString("en-US", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** Returns true if the given YYYY-MM-DD date string is strictly before today. */
export function isPastDate(dateStr: string): boolean {
  const todayStr = formatDate(new Date());
  return dateStr < todayStr;
}

/** Returns true if the given date+startTime combination is already in the past. */
export function isPastSlot(dateStr: string, startTime: string): boolean {
  const now = new Date();
  const todayStr = formatDate(now);
  if (dateStr < todayStr) return true;
  if (dateStr > todayStr) return false;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return timeToMinutes(startTime) <= nowMinutes;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidDateString(s: unknown): s is string {
  return typeof s === "string" && DATE_RE.test(s) && !Number.isNaN(new Date(s).getTime());
}

export function isValidTimeString(s: unknown): s is string {
  return typeof s === "string" && TIME_RE.test(s);
}
