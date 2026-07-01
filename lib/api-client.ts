export interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: "client" | "admin";
  phone: string | null;
}

export interface ApiCourt {
  id: number;
  courtNumber: number;
  name: string;
  sportType: string;
  openingTime: string;
  closingTime: string;
  slotDurationMinutes: number;
  openDays: number[];
  price: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface ApiSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface ApiAvailability {
  court?: ApiCourt;
  isOpen?: boolean;
  slots: ApiSlot[];
}

export interface ApiBooking {
  id: number;
  userId: number;
  courtId: number;
  bookingDate: string;
  startTime: string;
  endTime: string;
  price: number;
  status: "confirmed" | "cancelled" | "completed";
  createdAt: string;
  updatedAt: string;
  courtName?: string;
  courtNumber?: number;
  sportType?: string;
  clientName?: string;
  clientEmail?: string;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    credentials: "include",
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // no body
  }
  if (!res.ok) {
    const message =
      (data as { message?: string } | null)?.message ?? `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return data as T;
}

export const api = {
  register: (input: { name: string; email: string; password: string; phone?: string }) =>
    request<{ user: ApiUser }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  login: (input: { email: string; password: string }) =>
    request<{ user: ApiUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  logout: () => request<{ message: string }>("/api/auth/logout", { method: "POST" }),
  me: () => request<{ user: ApiUser | null }>("/api/auth/me"),

  courts: () => request<{ courts: ApiCourt[] }>("/api/courts"),
  court: (id: number) => request<{ court: ApiCourt }>(`/api/courts/${id}`),

  availability: (courtId: number, date: string) =>
    request<ApiAvailability>(`/api/availability?courtId=${courtId}&date=${date}`),

  createBooking: (input: {
    courtId: number;
    bookingDate: string;
    startTime: string;
    endTime: string;
  }) => request<{ booking: ApiBooking }>("/api/bookings", { method: "POST", body: JSON.stringify(input) }),

  myBookings: () => request<{ bookings: ApiBooking[] }>("/api/my-bookings"),

  cancelBooking: (id: number) =>
    request<{ booking: ApiBooking }>(`/api/bookings/${id}/cancel`, { method: "PATCH" }),

  admin: {
    courts: () => request<{ courts: ApiCourt[] }>("/api/admin/courts"),
    createCourt: (input: {
      courtNumber: number;
      name: string;
      sportType: string;
      openingTime: string;
      closingTime: string;
      slotDurationMinutes?: number;
      openDays?: number[];
      status?: "active" | "inactive";
    }) => request<{ court: ApiCourt }>("/api/admin/courts", { method: "POST", body: JSON.stringify(input) }),
    updateCourt: (id: number, input: Partial<Omit<ApiCourt, "id" | "createdAt" | "updatedAt">>) =>
      request<{ court: ApiCourt }>(`/api/admin/courts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    bookings: (filters?: { date?: string; courtId?: number; status?: string }) => {
      const params = new URLSearchParams();
      if (filters?.date) params.set("date", filters.date);
      if (filters?.courtId) params.set("courtId", String(filters.courtId));
      if (filters?.status) params.set("status", filters.status);
      const qs = params.toString();
      return request<{ bookings: ApiBooking[] }>(`/api/admin/bookings${qs ? `?${qs}` : ""}`);
    },
    cancelBooking: (id: number) =>
      request<{ booking: ApiBooking }>(`/api/admin/bookings/${id}/cancel`, { method: "PATCH" }),
  },
};
