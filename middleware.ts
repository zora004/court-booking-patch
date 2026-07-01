import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me-court-booking";
const COOKIE_NAME = "session_token";

const CLIENT_PROTECTED = ["/dashboard", "/book", "/my-bookings"];
const ADMIN_PROTECTED = ["/admin"];
const AUTH_PAGES = ["/login", "/register"];

interface Payload {
  userId: number;
  email: string;
  role: "client" | "admin";
  name: string;
}

function getSession(req: NextRequest): Payload | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as Payload;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = getSession(req);

  const isAdminPath = ADMIN_PROTECTED.some((p) => pathname.startsWith(p));
  const isClientPath = CLIENT_PROTECTED.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

  if (isAdminPath) {
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", `${pathname}${req.nextUrl.search}`);
      return NextResponse.redirect(url);
    }
    if (session.role !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  if (isClientPath && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", `${pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  runtime: "nodejs",
  matcher: ["/dashboard/:path*", "/book/:path*", "/my-bookings/:path*", "/admin/:path*", "/login", "/register"],
};
