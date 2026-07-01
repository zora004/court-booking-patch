import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ message: "You must be logged in." }, { status: 401 });
  if (session.role !== "admin")
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const courtId = searchParams.get("courtId");
  const status = searchParams.get("status");

  const clauses: string[] = [];
  const args: (string | number)[] = [];

  if (date) {
    clauses.push("b.bookingDate = ?");
    args.push(date);
  }
  if (courtId && Number.isInteger(Number(courtId))) {
    clauses.push("b.courtId = ?");
    args.push(Number(courtId));
  }
  if (status && ["confirmed", "cancelled", "completed"].includes(status)) {
    clauses.push("b.status = ?");
    args.push(status);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const bookings = db
    .prepare(
      `SELECT b.*, c.name as courtName, c.courtNumber, c.sportType,
              u.name as clientName, u.email as clientEmail
       FROM bookings b
       JOIN courts c ON c.id = b.courtId
       JOIN users u ON u.id = b.userId
       ${where}
       ORDER BY b.bookingDate DESC, b.startTime DESC`
    )
    .all(...args);

  return NextResponse.json({ bookings });
}
