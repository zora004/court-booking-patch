import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, CourtRow, BookingRow } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import {
  isPastDate,
  isPastSlot,
  isValidDateString,
  isValidTimeString,
  minutesToTime,
  timeToMinutes,
} from "@/lib/slots";
import {
  durationLabel,
  isCourtOpenOnDate,
  normalizeSlotDurationMinutes,
  parseOpenDays,
} from "@/lib/court-schedule";

const CreateBookingSchema = z.object({
  courtId: z.number().int().positive(),
  bookingDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
});

export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ message: "You must be logged in to book a court." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = CreateBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }
  const { courtId, bookingDate, startTime, endTime } = parsed.data;

  if (!isValidDateString(bookingDate)) {
    return NextResponse.json({ message: "Invalid booking date." }, { status: 400 });
  }
  if (!isValidTimeString(startTime) || !isValidTimeString(endTime)) {
    return NextResponse.json({ message: "Invalid start or end time." }, { status: 400 });
  }
  const court = db.prepare("SELECT * FROM courts WHERE id = ?").get(courtId) as unknown as
    | CourtRow
    | undefined;
  if (!court) {
    return NextResponse.json({ message: "Court not found." }, { status: 404 });
  }
  if (court.status !== "active") {
    return NextResponse.json({ message: "This court is not available for booking." }, { status: 400 });
  }

  if (!isCourtOpenOnDate(parseOpenDays(court.openDays), bookingDate)) {
    return NextResponse.json({ message: "This court is closed on the selected date." }, { status: 400 });
  }

  const slotDurationMinutes = normalizeSlotDurationMinutes(court.slotDurationMinutes);
  if (timeToMinutes(endTime) - timeToMinutes(startTime) !== slotDurationMinutes) {
    return NextResponse.json(
      { message: `Bookings for this court must be exactly ${durationLabel(slotDurationMinutes)} long.` },
      { status: 400 }
    );
  }

  if (isPastDate(bookingDate)) {
    return NextResponse.json({ message: "You cannot book a date in the past." }, { status: 400 });
  }
  if (isPastSlot(bookingDate, startTime)) {
    return NextResponse.json({ message: "You cannot book a time slot in the past." }, { status: 400 });
  }

  // Slot must align with the court's opening/closing hours.
  const open = timeToMinutes(court.openingTime);
  const close = timeToMinutes(court.closingTime);
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (
    start < open ||
    end > close ||
    minutesToTime(start) !== startTime ||
    minutesToTime(start + slotDurationMinutes) !== endTime ||
    (start - open) % slotDurationMinutes !== 0
  ) {
    return NextResponse.json(
      { message: "The selected time slot is outside this court's operating hours." },
      { status: 400 }
    );
  }

  // Re-verify availability server-side right before writing, then rely on the
  try {
    db.exec("BEGIN IMMEDIATE;");

    const existing = db
      .prepare(
        `SELECT id FROM bookings
         WHERE courtId = ? AND bookingDate = ? AND status = 'confirmed'
           AND startTime < ? AND endTime > ?`
      )
      .get(courtId, bookingDate, endTime, startTime);
    if (existing) {
      db.exec("ROLLBACK;");
      return NextResponse.json(
        { message: "This court is already booked for the selected time." },
        { status: 409 }
      );
    }

    const bookingPrice = Number(court.price ?? 0);

    const result = db
      .prepare(
        `INSERT INTO bookings (userId, courtId, bookingDate, startTime, endTime, price, status)
         VALUES (?, ?, ?, ?, ?, ?, 'confirmed')`
      )
      .run(session.userId, courtId, bookingDate, startTime, endTime, bookingPrice);

    const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(result.lastInsertRowid) as unknown as
      | BookingRow
      | undefined;

    db.exec("COMMIT;");
    return NextResponse.json({ booking }, { status: 201 });
  } catch (err: unknown) {
    try {
      db.exec("ROLLBACK;");
    } catch {
      // No open transaction to roll back.
    }
    // UNIQUE constraint violation = someone else booked this exact slot first.
    const message = err instanceof Error ? err.message : "";
    if (message.includes("UNIQUE")) {
      return NextResponse.json(
        { message: "This court is already booked for the selected time." },
        { status: 409 }
      );
    }
    return NextResponse.json({ message: "Failed to create booking." }, { status: 500 });
  }
}
