import { NextResponse } from "next/server";
import { db, CourtRow } from "@/lib/db";
import { serializeCourt } from "@/lib/court-schedule";

export async function GET() {
  const courts = db
    .prepare("SELECT * FROM courts WHERE status = 'active' ORDER BY courtNumber ASC")
    .all() as unknown as CourtRow[];
  return NextResponse.json({ courts: courts.map(serializeCourt) });
}
