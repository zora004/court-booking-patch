import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { db, UserRow } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.userId) as unknown as
    | UserRow
    | undefined;
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone },
  });
}
