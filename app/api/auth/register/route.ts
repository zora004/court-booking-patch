import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, UserRow } from "@/lib/db";
import { hashPassword, signSession, SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE } from "@/lib/auth";

const RegisterSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().trim().max(30).optional().nullable(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }
  const { name, email, password, phone } = parsed.data;

  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email) as { id: number } | undefined;
  if (existing) {
    return NextResponse.json(
      { message: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);

  const result = db
    .prepare(
      `INSERT INTO users (name, email, passwordHash, phone, role) VALUES (?, ?, ?, ?, 'client')`
    )
    .run(name, email, passwordHash, phone ?? null);

  const user = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(result.lastInsertRowid) as unknown as UserRow;

  const token = signSession({
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });

  const res = NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone },
  });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  });
  return res;
}
