"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiCourt } from "@/lib/api-client";
import { useAuth } from "@/components/AuthProvider";
import { durationLabel, formatOpenDays } from "@/lib/court-schedule";
import { formatDisplayTime } from "@/lib/slots";

export default function DashboardPage() {
  const { user } = useAuth();
  const [courts, setCourts] = useState<ApiCourt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .courts()
      .then((res) => setCourts(res.courts))
      .catch(() => setError("Could not load courts."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold text-slate-900">
        Welcome{user ? `, ${user.name.split(" ")[0]}` : ""} 👋
      </h1>
      <p className="mt-1 text-sm text-slate-500">Ready to reserve a court?</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/book"
          className="flex-1 rounded-xl bg-emerald-600 px-6 py-5 text-white shadow-sm hover:bg-emerald-700"
        >
          <p className="text-lg font-semibold">Book a court</p>
          <p className="text-sm text-emerald-100">Pick a court, date, and time slot.</p>
        </Link>
        <Link
          href="/my-bookings"
          className="flex-1 rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm hover:bg-slate-50"
        >
          <p className="text-lg font-semibold text-slate-900">My bookings</p>
          <p className="text-sm text-slate-500">View or cancel your upcoming reservations.</p>
        </Link>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-slate-900">Available courts</h2>

      {loading && <p className="mt-4 text-sm text-slate-400">Loading courts…</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courts.map((court) => (
            <div key={court.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-900">{court.name}</p>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                  Court {court.courtNumber}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{court.sportType}</p>
              <p className="mt-2 text-xs text-slate-400">
                Open {formatDisplayTime(court.openingTime)} – {formatDisplayTime(court.closingTime)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {durationLabel(court.slotDurationMinutes)} slots · {formatOpenDays(court.openDays)}
              </p>
              <Link
                href={`/book?courtId=${court.id}`}
                className="mt-4 inline-block text-sm font-medium text-emerald-700 hover:underline"
              >
                Book this court →
              </Link>
            </div>
          ))}
          {courts.length === 0 && (
            <p className="text-sm text-slate-400">No courts are available right now.</p>
          )}
        </div>
      )}
    </div>
  );
}
