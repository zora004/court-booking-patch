import { NextRequest, NextResponse } from "next/server";
import { db, CourtRow } from "@/lib/db";
import { serializeCourt } from "@/lib/court-schedule";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const courtId = Number(id);
  if (!Number.isInteger(courtId)) {
    return NextResponse.json({ message: "Invalid court id." }, { status: 400 });
  }
  const court = db.prepare("SELECT * FROM courts WHERE id = ?").get(courtId) as unknown as
    | CourtRow
    | undefined;
  if (!court) {
    return NextResponse.json({ message: "Court not found." }, { status: 404 });
  }
  return NextResponse.json({ court: serializeCourt(court) });
}
