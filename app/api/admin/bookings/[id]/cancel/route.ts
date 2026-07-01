import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { db, BookingRow } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ message: "You must be logged in." }, { status: 401 });
  if (session.role !== "admin")
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });

  const { id } = await params;
  const bookingId = Number(id);
  if (!Number.isInteger(bookingId)) {
    return NextResponse.json({ message: "Invalid booking id." }, { status: 400 });
  }

  const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(bookingId) as unknown as
    | BookingRow
    | undefined;
  if (!booking) {
    return NextResponse.json({ message: "Booking not found." }, { status: 404 });
  }
  if (booking.status === "cancelled") {
    return NextResponse.json({ message: "This booking is already cancelled." }, { status: 400 });
  }

  db.prepare(
    `UPDATE bookings SET status = 'cancelled', updatedAt = datetime('now') WHERE id = ?`
  ).run(bookingId);

  const updated = db.prepare("SELECT * FROM bookings WHERE id = ?").get(bookingId);
  return NextResponse.json({ booking: updated });
}
