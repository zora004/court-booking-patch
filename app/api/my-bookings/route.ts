import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ message: "You must be logged in." }, { status: 401 });
  }

  const bookings = db
    .prepare(
      `SELECT b.*, c.name as courtName, c.courtNumber, c.sportType
       FROM bookings b
       JOIN courts c ON c.id = b.courtId
       WHERE b.userId = ?
       ORDER BY b.bookingDate DESC, b.startTime DESC`
    )
    .all(session.userId);

  return NextResponse.json({ bookings });
}
