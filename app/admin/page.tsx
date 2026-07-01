"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiBooking, ApiCourt } from "@/lib/api-client";
import StatusBadge from "@/components/StatusBadge";
import { formatDate, formatDisplayTime } from "@/lib/slots";

export default function AdminOverviewPage() {
  const [courts, setCourts] = useState<ApiCourt[]>([]);
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.admin.courts(), api.admin.bookings()])
      .then(([c, b]) => {
        setCourts(c.courts);
        setBookings(b.bookings);
      })
      .finally(() => setLoading(false));
  }, []);

  const today = formatDate(new Date());
  const todaysBookings = bookings.filter((b) => b.bookingDate === today && b.status === "confirmed");
  const activeCourts = courts.filter((c) => c.status === "active");
  const confirmedTotal = bookings.filter((b) => b.status === "confirmed").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold text-slate-900">Admin Overview</h1>
      <p className="mt-1 text-sm text-slate-500">A snapshot of courts and bookings.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Active courts" value={`${activeCourts.length} / ${courts.length}`} />
        <StatCard label="Confirmed bookings" value={String(confirmedTotal)} />
        <StatCard label="Bookings today" value={String(todaysBookings.length)} />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/admin/courts"
          className="flex-1 rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm hover:bg-slate-50"
        >
          <p className="text-lg font-semibold text-slate-900">Manage courts</p>
          <p className="text-sm text-slate-500">Add, edit, activate or deactivate courts.</p>
        </Link>
        <Link
          href="/admin/bookings"
          className="flex-1 rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm hover:bg-slate-50"
        >
          <p className="text-lg font-semibold text-slate-900">Manage bookings</p>
          <p className="text-sm text-slate-500">Filter, review, and cancel bookings.</p>
        </Link>
      </div>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Today&apos;s bookings
      </h2>
      {loading && <p className="mt-3 text-sm text-slate-400">Loading…</p>}
      {!loading && (
        <div className="mt-3 space-y-3">
          {todaysBookings.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div>
                <p className="font-medium text-slate-900">
                  {b.courtName} <span className="text-slate-400">· {b.clientName}</span>
                </p>
                <p className="text-sm text-slate-500">
                  {formatDisplayTime(b.startTime)}–{formatDisplayTime(b.endTime)}
                </p>
              </div>
              <StatusBadge status={b.status} />
            </div>
          ))}
          {todaysBookings.length === 0 && (
            <p className="text-sm text-slate-400">No bookings scheduled for today.</p>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
