import { NextRequest, NextResponse } from "next/server";
import { db, CourtRow, BookingRow } from "@/lib/db";
import { generateSlotsForDate, isPastDate, isValidDateString } from "@/lib/slots";
import { isCourtOpenOnDate, parseOpenDays, serializeCourt } from "@/lib/court-schedule";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const courtIdRaw = searchParams.get("courtId");
  const date = searchParams.get("date");

  const courtId = Number(courtIdRaw);
  if (!courtIdRaw || !Number.isInteger(courtId)) {
    return NextResponse.json({ message: "A valid courtId is required." }, { status: 400 });
  }
  if (!date || !isValidDateString(date)) {
    return NextResponse.json({ message: "A valid date (YYYY-MM-DD) is required." }, { status: 400 });
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
  if (isPastDate(date)) {
    return NextResponse.json({ court: serializeCourt(court), isOpen: false, slots: [] });
  }

  const isOpen = isCourtOpenOnDate(parseOpenDays(court.openDays), date);
  const confirmedBookings = db
    .prepare(
      `SELECT startTime, endTime FROM bookings WHERE courtId = ? AND bookingDate = ? AND status = 'confirmed'`
    )
    .all(courtId, date) as Pick<BookingRow, "startTime" | "endTime">[];

  const slots = generateSlotsForDate(court, date, confirmedBookings);
  return NextResponse.json({ court: serializeCourt(court), isOpen, slots });
}
