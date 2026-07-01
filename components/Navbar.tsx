"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-emerald-600 text-white"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {children}
    </Link>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href={user ? (user.role === "admin" ? "/admin" : "/dashboard") : "/login"} className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold">C</span>
          <span className="text-lg font-semibold text-slate-900">CourtBook</span>
        </Link>

        {user && (
          <nav className="hidden items-center gap-1 sm:flex">
            {user.role === "client" && (
              <>
                <NavLink href="/dashboard">Dashboard</NavLink>
                <NavLink href="/availability">Availability</NavLink>
                <NavLink href="/book">Book a Court</NavLink>
                <NavLink href="/my-bookings">My Bookings</NavLink>
              </>
            )}
            {user.role === "admin" && (
              <>
                <NavLink href="/admin">Overview</NavLink>
                <NavLink href="/admin/courts">Courts</NavLink>
                <NavLink href="/admin/bookings">Bookings</NavLink>
                <NavLink href="/availability">Availability</NavLink>
              </>
            )}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden text-sm text-slate-500 sm:inline">
                {user.name} <span className="text-slate-300">·</span>{" "}
                <span className="capitalize">{user.role}</span>
              </span>
              <button
                onClick={logout}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Log out
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/availability" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                Availability
              </Link>
              <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>

      {user && (
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 sm:hidden">
          {user.role === "client" && (
            <>
              <NavLink href="/dashboard">Dashboard</NavLink>
              <NavLink href="/availability">Availability</NavLink>
              <NavLink href="/book">Book</NavLink>
              <NavLink href="/my-bookings">My Bookings</NavLink>
            </>
          )}
          {user.role === "admin" && (
            <>
              <NavLink href="/admin">Overview</NavLink>
              <NavLink href="/admin/courts">Courts</NavLink>
              <NavLink href="/admin/bookings">Bookings</NavLink>
              <NavLink href="/availability">Availability</NavLink>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
