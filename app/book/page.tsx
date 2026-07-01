"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiCourt, ApiSlot, ApiError } from "@/lib/api-client";
import { formatDate, formatDisplayDate, formatDisplayTime } from "@/lib/slots";
import { durationLabel, formatOpenDays, formatPrice, isCourtOpenOnDate } from "@/lib/court-schedule";
import ConfirmModal from "@/components/ConfirmModal";

export default function BookPage() {
  return (
    <Suspense fallback={null}>
      <BookFlow />
    </Suspense>
  );
}

function todayStr() {
  return formatDate(new Date());
}

function BookFlow() {
  const router = useRouter();
  const params = useSearchParams();

  const [courts, setCourts] = useState<ApiCourt[]>([]);
  const [courtsLoading, setCourtsLoading] = useState(true);
  const [courtsError, setCourtsError] = useState<string | null>(null);

  const [courtId, setCourtId] = useState<number | null>(
    params.get("courtId") ? Number(params.get("courtId")) : null
  );
  const [date, setDate] = useState<string>(todayStr());
  const [slots, setSlots] = useState<ApiSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<ApiSlot | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [successBooking, setSuccessBooking] = useState<{
    courtName: string;
    date: string;
    startTime: string;
    endTime: string;
    price: number;
  } | null>(null);

  useEffect(() => {
    api
      .courts()
      .then((res) => {
        setCourts(res.courts);
        if (!courtId && res.courts.length > 0) {
          setSlotsLoading(true);
          setCourtId(res.courts[0].id);
        }
      })
      .catch(() => setCourtsError("Could not load courts."))
      .finally(() => setCourtsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!courtId || !date) return;
    let active = true;

    api
      .availability(courtId, date)
      .then((res) => {
        if (!active) return;
        setSlots(res.slots);
        setSlotsError(null);
      })
      .catch((err) => {
        if (active) setSlotsError(err instanceof ApiError ? err.message : "Could not load availability.");
      })
      .finally(() => {
        if (active) setSlotsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [courtId, date]);

  const selectedCourt = useMemo(() => courts.find((c) => c.id === courtId) ?? null, [courts, courtId]);
  const selectedCourtIsOpen = selectedCourt ? isCourtOpenOnDate(selectedCourt.openDays, date) : true;

  async function handleConfirmBooking() {
    if (!courtId || !selectedSlot) return;
    setBooking(true);
    setBookingError(null);
    try {
      await api.createBooking({
        courtId,
        bookingDate: date,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      });
      setSuccessBooking({
        courtName: selectedCourt?.name ?? "Court",
        date,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        price: selectedCourt?.price ?? 0,
      });
      setConfirmOpen(false);
      // Refresh slots so the just-booked slot shows as unavailable.
      const res = await api.availability(courtId, date);
      setSlots(res.slots);
      setSelectedSlot(null);
    } catch (err) {
      setBookingError(err instanceof ApiError ? err.message : "Failed to create booking.");
    } finally {
      setBooking(false);
    }
  }

  if (successBooking) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl">✅</div>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">Booking confirmed!</h1>
        <p className="mt-2 text-sm text-slate-600">
          {successBooking.courtName} is reserved for{" "}
          <span className="font-medium">{formatDisplayDate(successBooking.date)}</span> from{" "}
          <span className="font-medium">
            {formatDisplayTime(successBooking.startTime)} – {formatDisplayTime(successBooking.endTime)}
          </span>
          .
        </p>
        <p className="mt-2 text-sm font-medium text-emerald-700">{formatPrice(successBooking.price)}</p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => router.push("/my-bookings")}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            View my bookings
          </button>
          <button
            onClick={() => setSuccessBooking(null)}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Book another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold text-slate-900">Book a court</h1>
      <p className="mt-1 text-sm text-slate-500">Court → Date → Time → Confirm</p>

      {/* Step 1: Court */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">1. Select a court</h2>
        {courtsLoading && <p className="mt-3 text-sm text-slate-400">Loading courts…</p>}
        {courtsError && <p className="mt-3 text-sm text-red-600">{courtsError}</p>}
        {!courtsLoading && !courtsError && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {courts.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setCourtId(c.id);
                  setSelectedSlot(null);
                  setSlotsLoading(true);
                  setSlotsError(null);
                }}
                className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                  courtId === c.id
                    ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <p className="font-medium text-slate-900">{c.name}</p>
                <p className="text-xs text-slate-500">{c.sportType}</p>
                <p className="text-xs text-slate-400">
                  {formatDisplayTime(c.openingTime)}–{formatDisplayTime(c.closingTime)}
                </p>
                <p className="text-xs text-slate-400">
                  {durationLabel(c.slotDurationMinutes)} slots · {formatOpenDays(c.openDays)}
                </p>
                <p className="mt-1 text-sm font-semibold text-emerald-700">{formatPrice(c.price)}</p>
              </button>
            ))}
            {courts.length === 0 && <p className="text-sm text-slate-400">No active courts available.</p>}
          </div>
        )}
      </section>

      {/* Step 2: Date */}
      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">2. Select a date</h2>
        <input
          type="date"
          min={todayStr()}
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setSelectedSlot(null);
            setSlotsLoading(true);
            setSlotsError(null);
          }}
          className="mt-3 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </section>

      {/* Step 3: Time */}
      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">3. Select a time slot</h2>
        {slotsLoading && <p className="mt-3 text-sm text-slate-400">Loading availability…</p>}
        {slotsError && <p className="mt-3 text-sm text-red-600">{slotsError}</p>}
        {!slotsLoading && !slotsError && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {slots.map((s) => (
              <button
                key={s.startTime}
                disabled={!s.available}
                onClick={() => setSelectedSlot(s)}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  !s.available
                    ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 line-through"
                    : selectedSlot?.startTime === s.startTime
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {formatDisplayTime(s.startTime)}–{formatDisplayTime(s.endTime)}
              </button>
            ))}
            {slots.length === 0 && (
              <p className="col-span-full text-sm text-slate-400">
                {selectedCourt && !selectedCourtIsOpen
                  ? "This court is closed on the selected date."
                  : "No slots available for this date."}
              </p>
            )}
          </div>
        )}
      </section>

      {/* Step 4: Confirm */}
      <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-sm text-slate-600">
          {selectedCourt && selectedSlot ? (
            <>
              <span className="font-medium text-slate-900">{selectedCourt.name}</span> on{" "}
              <span className="font-medium text-slate-900">{formatDisplayDate(date)}</span> at{" "}
              <span className="font-medium text-slate-900">
                {formatDisplayTime(selectedSlot.startTime)}–{formatDisplayTime(selectedSlot.endTime)}
              </span>
              <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                {formatPrice(selectedCourt.price)}
              </span>
            </>
          ) : (
            "Select a court, date, and time to continue."
          )}
        </div>
        <button
          disabled={!selectedSlot}
          onClick={() => {
            setBookingError(null);
            setConfirmOpen(true);
          }}
          className="rounded-md bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Confirm booking
        </button>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Confirm your booking"
        description={
          selectedCourt && selectedSlot
            ? `${selectedCourt.name} · ${formatDisplayDate(date)} · ${formatDisplayTime(selectedSlot.startTime)}–${formatDisplayTime(selectedSlot.endTime)} · ${formatPrice(selectedCourt.price)}`
            : undefined
        }
        confirmLabel="Book court"
        loading={booking}
        onConfirm={handleConfirmBooking}
        onClose={() => setConfirmOpen(false)}
      >
        {bookingError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-200">
            {bookingError}
          </p>
        )}
      </ConfirmModal>
    </div>
  );
}
