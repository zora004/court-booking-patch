import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { db, CourtRow } from "@/lib/db";
import { isValidTimeString } from "@/lib/slots";
import {
  isValidOpenDays,
  isValidSlotDurationMinutes,
  normalizeOpenDays,
  openDaysToDb,
  parseOpenDays,
  serializeCourt,
} from "@/lib/court-schedule";

function requireAdmin(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return { error: NextResponse.json({ message: "You must be logged in." }, { status: 401 }) };
  if (session.role !== "admin")
    return { error: NextResponse.json({ message: "Admin access required." }, { status: 403 }) };
  return { session };
}

const UpdateCourtSchema = z.object({
  courtNumber: z.number().int().positive().optional(),
  name: z.string().trim().min(1).max(100).optional(),
  sportType: z.string().trim().min(1).max(50).optional(),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  slotDurationMinutes: z.number().int().optional(),
  openDays: z.array(z.number().int()).optional(),
  price: z.number().nonnegative().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = requireAdmin(req);
  if (error) return error;

  const { id } = await params;
  const courtId = Number(id);
  if (!Number.isInteger(courtId)) {
    return NextResponse.json({ message: "Invalid court id." }, { status: 400 });
  }

  const existing = db.prepare("SELECT * FROM courts WHERE id = ?").get(courtId) as unknown as
    | CourtRow
    | undefined;
  if (!existing) {
    return NextResponse.json({ message: "Court not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = UpdateCourtSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }
  const updates = parsed.data;

  const openingTime = updates.openingTime ?? existing.openingTime;
  const closingTime = updates.closingTime ?? existing.closingTime;
  if (!isValidTimeString(openingTime) || !isValidTimeString(closingTime)) {
    return NextResponse.json({ message: "Opening/closing time must be in HH:MM format." }, { status: 400 });
  }
  if (openingTime >= closingTime) {
    return NextResponse.json({ message: "Opening time must be before closing time." }, { status: 400 });
  }

  const slotDurationMinutes = updates.slotDurationMinutes ?? existing.slotDurationMinutes;
  if (!isValidSlotDurationMinutes(slotDurationMinutes)) {
    return NextResponse.json(
      { message: "Booking duration must be a 15-minute increment between 15 and 240 minutes." },
      { status: 400 }
    );
  }

  const openDays = updates.openDays ?? parseOpenDays(existing.openDays);
  if (!isValidOpenDays(openDays)) {
    return NextResponse.json({ message: "Select at least one valid open day." }, { status: 400 });
  }

  db.prepare(
    `UPDATE courts SET
       courtNumber = ?, name = ?, sportType = ?, openingTime = ?, closingTime = ?,
       slotDurationMinutes = ?, openDays = ?, price = ?, status = ?,
       updatedAt = datetime('now')
     WHERE id = ?`
  ).run(
    updates.courtNumber ?? existing.courtNumber,
    updates.name ?? existing.name,
    updates.sportType ?? existing.sportType,
    openingTime,
    closingTime,
    slotDurationMinutes,
    openDaysToDb(normalizeOpenDays(openDays)),
    updates.price ?? existing.price,
    updates.status ?? existing.status,
    courtId
  );

  const court = db.prepare("SELECT * FROM courts WHERE id = ?").get(courtId) as unknown as CourtRow;
  return NextResponse.json({ court: serializeCourt(court) });
}
