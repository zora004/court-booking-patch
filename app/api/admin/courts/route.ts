import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { db, CourtRow } from "@/lib/db";
import { isValidTimeString } from "@/lib/slots";
import {
  DEFAULT_OPEN_DAYS,
  DEFAULT_SLOT_DURATION_MINUTES,
  isValidOpenDays,
  isValidSlotDurationMinutes,
  normalizeOpenDays,
  openDaysToDb,
  serializeCourt,
} from "@/lib/court-schedule";

function requireAdmin(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return { error: NextResponse.json({ message: "You must be logged in." }, { status: 401 }) };
  if (session.role !== "admin")
    return { error: NextResponse.json({ message: "Admin access required." }, { status: 403 }) };
  return { session };
}

export async function GET(req: NextRequest) {
  const { error } = requireAdmin(req);
  if (error) return error;

  const courts = db.prepare("SELECT * FROM courts ORDER BY courtNumber ASC").all() as unknown as CourtRow[];
  return NextResponse.json({ courts: courts.map(serializeCourt) });
}

const CreateCourtSchema = z.object({
  courtNumber: z.number().int().positive(),
  name: z.string().trim().min(1).max(100),
  sportType: z.string().trim().min(1).max(50),
  openingTime: z.string(),
  closingTime: z.string(),
  slotDurationMinutes: z.number().int().optional(),
  openDays: z.array(z.number().int()).optional(),
  price: z.number().nonnegative().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export async function POST(req: NextRequest) {
  const { error } = requireAdmin(req);
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = CreateCourtSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }
  const {
    courtNumber,
    name,
    sportType,
    openingTime,
    closingTime,
    slotDurationMinutes = DEFAULT_SLOT_DURATION_MINUTES,
    openDays = DEFAULT_OPEN_DAYS,
    price = 0,
    status,
  } = parsed.data;

  if (!isValidTimeString(openingTime) || !isValidTimeString(closingTime)) {
    return NextResponse.json({ message: "Opening/closing time must be in HH:MM format." }, { status: 400 });
  }
  if (openingTime >= closingTime) {
    return NextResponse.json({ message: "Opening time must be before closing time." }, { status: 400 });
  }
  if (!isValidSlotDurationMinutes(slotDurationMinutes)) {
    return NextResponse.json(
      { message: "Booking duration must be a 15-minute increment between 15 and 240 minutes." },
      { status: 400 }
    );
  }
  if (!isValidOpenDays(openDays)) {
    return NextResponse.json({ message: "Select at least one valid open day." }, { status: 400 });
  }

  const result = db
    .prepare(
      `INSERT INTO courts (courtNumber, name, sportType, openingTime, closingTime, slotDurationMinutes, openDays, price, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      courtNumber,
      name,
      sportType,
      openingTime,
      closingTime,
      slotDurationMinutes,
      openDaysToDb(normalizeOpenDays(openDays)),
      price,
      status ?? "active"
    );

  const court = db.prepare("SELECT * FROM courts WHERE id = ?").get(result.lastInsertRowid) as unknown as CourtRow;
  return NextResponse.json({ court: serializeCourt(court) }, { status: 201 });
}
