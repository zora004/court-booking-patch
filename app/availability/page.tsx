"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, ApiCourt, ApiSlot } from "@/lib/api-client";
import { formatDate, formatDisplayTime } from "@/lib/slots";
import {
  durationLabel,
  formatOpenDays,
  isCourtOpenOnDate,
} from "@/lib/court-schedule";
import { useAuth } from "@/components/AuthProvider";

type CourtSlots = Record<number, ApiSlot[]>;

function todayStr() {
  return formatDate(new Date());
}

export default function PublicAvailabilityPage() {
  const { user } = useAuth();
  const [courts, setCourts] = useState<ApiCourt[]>([]);
  const [slotsByCourt, setSlotsByCourt] = useState<CourtSlots>({});
  const [date, setDate] = useState(todayStr());
  const [sportFilter, setSportFilter] = useState("");
  const [loadingCourts, setLoadingCourts] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .courts()
      .then((res) => {
        setCourts(res.courts);
        if (res.courts.length > 0) setLoadingSlots(true);
      })
      .catch(() => setError("Could not load courts."))
      .finally(() => setLoadingCourts(false));
  }, []);

  useEffect(() => {
    if (courts.length === 0 || !date) return;

    let cancelled = false;

    Promise.all(
      courts.map(async (court) => {
        const availability = await api.availability(court.id, date);
        return [court.id, availability.slots] as const;
      })
    )
      .then((entries) => {
        if (cancelled) return;
        setSlotsByCourt(Object.fromEntries(entries));
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load availability for this date.");
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });

    return () => {
      cancelled = true;
    };
  }, [courts, date]);

  const sports = useMemo(
    () => Array.from(new Set(courts.map((court) => court.sportType))).sort(),
    [courts]
  );

  const visibleCourts = useMemo(
    () => courts.filter((court) => !sportFilter || court.sportType === sportFilter),
    [courts, sportFilter]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Court Availability</h1>
          <p className="mt-1 text-sm text-slate-500">
            Check open courts and time slots before logging in.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <label className="block text-xs font-medium text-slate-500">Date</label>
            <input
              type="date"
              min={todayStr()}
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setLoadingSlots(true);
                setError(null);
              }}
              className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Sport</label>
            <select
              value={sportFilter}
              onChange={(event) => setSportFilter(event.target.value)}
              className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">All sports</option>
              {sports.map((sport) => (
                <option key={sport} value={sport}>
                  {sport}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {(loadingCourts || loadingSlots) && (
        <p className="mt-6 text-sm text-slate-400">Loading availability...</p>
      )}
      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {!loadingCourts && !error && (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {visibleCourts.map((court) => {
            const slots = slotsByCourt[court.id] ?? [];
            const availableSlots = slots.filter((slot) => slot.available);
            const closedForDate = !isCourtOpenOnDate(court.openDays, date);
            const nextHref = `/book?courtId=${court.id}`;
            const loginHref = `/login?next=${encodeURIComponent(nextHref)}`;

            return (
              <section
                key={court.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{court.name}</p>
                    <p className="text-sm text-slate-500">
                      Court {court.courtNumber} · {court.sportType}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                    {availableSlots.length} open
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-500 sm:grid-cols-3">
                  <p>Hours: {formatDisplayTime(court.openingTime)}–{formatDisplayTime(court.closingTime)}</p>
                  <p>Duration: {durationLabel(court.slotDurationMinutes)}</p>
                  <p>Days: {formatOpenDays(court.openDays)}</p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {availableSlots.slice(0, 9).map((slot) => (
                    <span
                      key={slot.startTime}
                      className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-sm font-medium text-emerald-800"
                    >
                      {formatDisplayTime(slot.startTime)}–{formatDisplayTime(slot.endTime)}
                    </span>
                  ))}
                  {availableSlots.length > 9 && (
                    <span className="rounded-md border border-slate-200 px-3 py-2 text-center text-sm text-slate-500">
                      +{availableSlots.length - 9} more
                    </span>
                  )}
                </div>

                {closedForDate && (
                  <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">
                    This court is closed on the selected date.
                  </p>
                )}
                {!closedForDate && availableSlots.length === 0 && !loadingSlots && (
                  <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">
                    No available slots for this date.
                  </p>
                )}

                <div className="mt-5">
                  <Link
                    href={user ? nextHref : loginHref}
                    className={`inline-flex rounded-md px-4 py-2 text-sm font-medium ${
                      availableSlots.length === 0
                        ? "pointer-events-none bg-slate-100 text-slate-400"
                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                    }`}
                  >
                    {user ? "Book this court" : "Log in to book"}
                  </Link>
                </div>
              </section>
            );
          })}

          {visibleCourts.length === 0 && (
            <p className="text-sm text-slate-400">No courts match the selected filters.</p>
          )}
        </div>
      )}
    </div>
  );
}
