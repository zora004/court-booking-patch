"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiBooking, ApiError } from "@/lib/api-client";
import StatusBadge from "@/components/StatusBadge";
import ConfirmModal from "@/components/ConfirmModal";
import { formatDate, formatDisplayDate, formatDisplayTime } from "@/lib/slots";
import { formatPrice } from "@/lib/court-schedule";

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cancelTarget, setCancelTarget] = useState<ApiBooking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api
      .myBookings()
      .then((res) => setBookings(res.bookings))
      .catch(() => setError("Could not load your bookings."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    let active = true;

    api
      .myBookings()
      .then((res) => {
        if (active) setBookings(res.bookings);
      })
      .catch(() => {
        if (active) setError("Could not load your bookings.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const today = formatDate(new Date());
  const upcoming = bookings.filter((b) => b.status === "confirmed" && b.bookingDate >= today);
  const past = bookings.filter((b) => !(b.status === "confirmed" && b.bookingDate >= today));

  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await api.cancelBooking(cancelTarget.id);
      setCancelTarget(null);
      load();
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : "Failed to cancel booking.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">My Bookings</h1>
        <Link
          href="/book"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + New booking
        </Link>
      </div>

      {loading && <p className="mt-6 text-sm text-slate-400">Loading your bookings…</p>}
      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <>
          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Upcoming
          </h2>
          <BookingList
            bookings={upcoming}
            emptyText="You have no upcoming bookings."
            onCancel={(b) => {
              setCancelError(null);
              setCancelTarget(b);
            }}
          />

          <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-slate-400">
            History
          </h2>
          <BookingList bookings={past} emptyText="No past or cancelled bookings yet." />
        </>
      )}

      <ConfirmModal
        open={!!cancelTarget}
        title="Cancel this booking?"
        description={
          cancelTarget
            ? `${cancelTarget.courtName} · ${formatDisplayDate(cancelTarget.bookingDate)} · ${formatDisplayTime(cancelTarget.startTime)}–${formatDisplayTime(cancelTarget.endTime)}`
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

function BookingList({
  bookings,
  emptyText,
  onCancel,
}: {
  bookings: ApiBooking[];
  emptyText: string;
  onCancel?: (b: ApiBooking) => void;
}) {
  if (bookings.length === 0) {
    return <p className="mt-3 text-sm text-slate-400">{emptyText}</p>;
  }
  return (
    <div className="mt-3 space-y-3">
      {bookings.map((b) => (
        <div
          key={b.id}
          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div>
            <p className="font-medium text-slate-900">
              {b.courtName} <span className="text-slate-400">· {b.sportType}</span>
            </p>
            <p className="text-sm text-slate-500">
              {formatDisplayDate(b.bookingDate)} · {formatDisplayTime(b.startTime)}–{formatDisplayTime(b.endTime)}
            </p>
            <p className="mt-1 text-sm font-semibold text-emerald-700">{formatPrice(b.price)}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={b.status} />
            {onCancel && b.status === "confirmed" && (
              <button
                onClick={() => onCancel(b)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
