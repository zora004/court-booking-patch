"use client";

import { useEffect, useState } from "react";
import { api, ApiCourt, ApiError } from "@/lib/api-client";
import StatusBadge from "@/components/StatusBadge";
import { formatDisplayTime } from "@/lib/slots";
import {
  BOOKING_DURATION_OPTIONS,
  DEFAULT_OPEN_DAYS,
  DEFAULT_SLOT_DURATION_MINUTES,
  WEEKDAY_OPTIONS,
  durationLabel,
  formatOpenDays,
  formatPrice,
  normalizeOpenDays,
} from "@/lib/court-schedule";

interface CourtFormState {
  courtNumber: string;
  name: string;
  sportType: string;
  openingTime: string;
  closingTime: string;
  slotDurationMinutes: string;
  openDays: number[];
  price: string;
}

const EMPTY_FORM: CourtFormState = {
  courtNumber: "",
  name: "",
  sportType: "",
  openingTime: "08:00",
  closingTime: "22:00",
  slotDurationMinutes: String(DEFAULT_SLOT_DURATION_MINUTES),
  openDays: [...DEFAULT_OPEN_DAYS],
  price: "0",
};

export default function AdminCourtsPage() {
  const [courts, setCourts] = useState<ApiCourt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CourtFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api.admin
      .courts()
      .then((res) => setCourts(res.courts))
      .catch(() => setError("Could not load courts."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    let active = true;

    api.admin
      .courts()
      .then((res) => {
        if (active) setCourts(res.courts);
      })
      .catch(() => {
        if (active) setError("Could not load courts.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function startEdit(court: ApiCourt) {
    setEditingId(court.id);
    setForm({
      courtNumber: String(court.courtNumber),
      name: court.name,
      sportType: court.sportType,
      openingTime: court.openingTime,
      closingTime: court.closingTime,
      slotDurationMinutes: String(court.slotDurationMinutes),
      openDays: normalizeOpenDays(court.openDays),
      price: String(court.price ?? 0),
    });
    setFormError(null);
    setShowForm(true);
  }

  function toggleOpenDay(day: number) {
    setForm((current) => {
      const nextDays = current.openDays.includes(day)
        ? current.openDays.filter((openDay) => openDay !== day)
        : [...current.openDays, day];

      return {
        ...current,
        openDays: nextDays.length ? normalizeOpenDays(nextDays) : current.openDays,
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        courtNumber: Number(form.courtNumber),
        name: form.name.trim(),
        sportType: form.sportType.trim(),
        openingTime: form.openingTime,
        closingTime: form.closingTime,
        slotDurationMinutes: Number(form.slotDurationMinutes),
        openDays: normalizeOpenDays(form.openDays),
        price: Number(form.price),
      };
      if (editingId) {
        await api.admin.updateCourt(editingId, payload);
      } else {
        await api.admin.createCourt(payload);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to save court.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(court: ApiCourt) {
    try {
      await api.admin.updateCourt(court.id, {
        status: court.status === "active" ? "inactive" : "active",
      });
      load();
    } catch {
      setError("Failed to update court status.");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Court Management</h1>
        <button
          onClick={startCreate}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + Add court
        </button>
      </div>

      {loading && <p className="mt-6 text-sm text-slate-400">Loading courts…</p>}
      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Court</th>
                <th className="px-4 py-3">Sport</th>
                <th className="px-4 py-3">Hours</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Open days</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courts.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    #{c.courtNumber} {c.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.sportType}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDisplayTime(c.openingTime)}–{formatDisplayTime(c.closingTime)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {durationLabel(c.slotDurationMinutes)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatPrice(c.price)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatOpenDays(c.openDays)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => startEdit(c)}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleStatus(c)}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                          c.status === "active"
                            ? "border border-red-200 text-red-700 hover:bg-red-50"
                            : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        {c.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {courts.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-400">
                    No courts yet. Add one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form
            onSubmit={handleSubmit}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-semibold text-slate-900">
              {editingId ? "Edit court" : "Add a new court"}
            </h3>

            {formError && (
              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-200">
                {formError}
              </p>
            )}

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Court number</label>
                <input
                  required
                  type="number"
                  min={1}
                  value={form.courtNumber}
                  onChange={(e) => setForm((f) => ({ ...f, courtNumber: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Court 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Sport type</label>
                <input
                  required
                  value={form.sportType}
                  onChange={(e) => setForm((f) => ({ ...f, sportType: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Basketball"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700">Opening time</label>
                  <input
                    required
                    type="time"
                    value={form.openingTime}
                    onChange={(e) => setForm((f) => ({ ...f, openingTime: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700">Closing time</label>
                  <input
                    required
                    type="time"
                    value={form.closingTime}
                    onChange={(e) => setForm((f) => ({ ...f, closingTime: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Price per booking</label>
                <input
                  required
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Duration per booking
                </label>
                <select
                  required
                  value={form.slotDurationMinutes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, slotDurationMinutes: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {BOOKING_DURATION_OPTIONS.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {durationLabel(minutes)}
                    </option>
                  ))}
                </select>
              </div>
              <fieldset>
                <legend className="block text-sm font-medium text-slate-700">Open days</legend>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {WEEKDAY_OPTIONS.map((day) => (
                    <label
                      key={day.value}
                      className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={form.openDays.includes(day.value)}
                        onChange={() => toggleOpenDay(day.value)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      {day.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={saving}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : editingId ? "Save changes" : "Add court"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
