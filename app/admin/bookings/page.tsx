"use client";

import { useEffect, useState } from "react";
import { api, ApiBooking, ApiCourt, ApiError } from "@/lib/api-client";
import StatusBadge from "@/components/StatusBadge";
import ConfirmModal from "@/components/ConfirmModal";
import { formatDisplayDate, formatDisplayTime } from "@/lib/slots";

export default function AdminBookingsPage() {
  const [courts, setCourts] = useState<ApiCourt[]>([]);
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateFilter, setDateFilter] = useState("");
  const [courtFilter, setCourtFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [cancelTarget, setCancelTarget] = useState<ApiBooking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    api.admin.courts().then((res) => setCourts(res.courts));
  }, []);

  function load() {
    setLoading(true);
    setError(null);
    api.admin
      .bookings({
        date: dateFilter || undefined,
        courtId: courtFilter ? Number(courtFilter) : undefined,
        status: statusFilter || undefined,
      })
      .then((res) => setBookings(res.bookings))
      .catch(() => setError("Could not load bookings."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    let active = true;

    api.admin
      .bookings({
        date: dateFilter || undefined,
        courtId: courtFilter ? Number(courtFilter) : undefined,
        status: statusFilter || undefined,
      })
      .then((res) => {
        if (active) setBookings(res.bookings);
      })
      .catch(() => {
        if (active) setError("Could not load bookings.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dateFilter, courtFilter, statusFilter]);

  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await api.admin.cancelBooking(cancelTarget.id);
      setCancelTarget(null);
      load();
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : "Failed to cancel booking.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold text-slate-900">Booking Management</h1>
      <p className="mt-1 text-sm text-slate-500">Filter and manage all bookings.</p>

      <div className="mt-6 flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <label className="block text-xs font-medium text-slate-500">Date</label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Court</label>
          <select
            value={courtFilter}
            onChange={(e) => setCourtFilter(e.target.value)}
            className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">All courts</option>
            {courts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        {(dateFilter || courtFilter || statusFilter) && (
          <div className="flex items-end">
            <button
              onClick={() => {
                setDateFilter("");
                setCourtFilter("");
                setStatusFilter("");
              }}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {loading && <p className="mt-6 text-sm text-slate-400">Loading bookings…</p>}
      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Court</th>
                <th className="px-4 py-3">Sport</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{b.clientName}</p>
                    <p className="text-xs text-slate-400">{b.clientEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{b.courtName}</td>
                  <td className="px-4 py-3 text-slate-600">{b.sportType ?? "N/A"}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDisplayDate(b.bookingDate)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDisplayTime(b.startTime)}–{formatDisplayTime(b.endTime)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {b.status === "confirmed" && (
                      <button
                        onClick={() => {
                          setCancelError(null);
                          setCancelTarget(b);
                        }}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-400">
                    No bookings match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={!!cancelTarget}
        title="Cancel this booking?"
        description={
          cancelTarget
            ? `${cancelTarget.clientName} · ${cancelTarget.courtName} · ${formatDisplayDate(cancelTarget.bookingDate)} · ${formatDisplayTime(cancelTarget.startTime)}–${formatDisplayTime(cancelTarget.endTime)}`
            : undefined
        }
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
        danger
        loading={cancelling}
        onConfirm={handleCancel}
        onClose={() => setCancelTarget(null)}
      >
        {cancelError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-200">
            {cancelError}
          </p>
        )}
      </ConfirmModal>
    </div>
  );
}
