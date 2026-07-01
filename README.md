# CourtBook — Sports Court Booking System (MVP)

A full-stack sports court booking app. Visitors can check public availability,
clients can pick a court/date/time slot and book, and double-booking is
prevented server-side. Admins manage courts, schedules, and bookings.

## Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS
- **Backend:** Next.js API routes (Node.js runtime)
- **Database:** SQLite, accessed via Node's built-in `node:sqlite` module —
  no native build step, no external services required
- **Auth:** email/password with bcrypt password hashing and JWT stored in an
  httpOnly cookie; route protection via Next.js middleware + per-route role
  checks

> Note on the database layer: Prisma and `better-sqlite3` both require
> downloading a compiled binary at install time, which wasn't reachable in
> the environment this was built in. This project uses Node's built-in
> `node:sqlite` (experimental but fully functional) with hand-written SQL —
> zero extra native dependencies. If you'd prefer Prisma in your own
> environment, the schema in `lib/db.ts` maps directly to the `User` /
> `Court` / `Booking` models described in the spec and can be ported over.

## Requirements

- Node.js 22.5+ (needed for `node:sqlite`)
- npm

## Getting started

```bash
npm install
npm run seed     # creates data/app.db and seeds sample data
npm run dev      # starts the dev server on http://localhost:3000
```

Then open http://localhost:3000 — visitors land on `/availability`, where they
can check open courts and slots before logging in.

### Demo accounts (created by `npm run seed`)

| Role   | Email                     | Password   |
|--------|----------------------------|------------|
| Admin  | admin@courtbooking.test    | Admin123!  |
| Client | client@courtbooking.test   | Client123! |

The seed script also creates 3 sample courts with different booking durations
and open-day schedules (Court 1: Basketball, Court 2: Tennis, Court 3:
Badminton — inactive) and a few sample bookings, one of which is already
cancelled so you can see both states.

Re-running `npm run seed` wipes and re-seeds the database, so it's safe to
run any time you want a clean slate.

### Production build

```bash
npm run build
npm run start
```

## Project structure

```
app/
  api/                 Backend REST endpoints (see below)
  availability/         Public availability view, no login required
  login/, register/    Auth pages
  dashboard/            Client home
  book/                  Booking flow: court -> date -> time -> confirm
  my-bookings/          Client's bookings, with cancel
  admin/                Admin overview
  admin/courts/         Court management, duration, open days, status
  admin/bookings/       Booking management with filters + cancel
lib/
  db.ts                 SQLite connection + schema (users, courts, bookings)
  auth.ts               Password hashing, JWT sign/verify, session cookie
  slots.ts              Time-slot generation & date/time validation
  api-client.ts          Typed fetch wrapper used by the frontend
components/             Shared UI: Navbar, ConfirmModal, StatusBadge, AuthProvider
middleware.ts            Redirects unauthenticated/unauthorized users
scripts/seed.ts          Seed script
```

## API endpoints

**Auth**
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET  /api/auth/me`

**Courts**
- `GET /api/courts` — active courts only
- `GET /api/courts/:id`

**Availability**
- `GET /api/availability?courtId={id}&date={YYYY-MM-DD}`

**Bookings**
- `POST /api/bookings`
- `GET  /api/my-bookings`
- `PATCH /api/bookings/:id/cancel`

**Admin** (role: admin)
- `GET   /api/admin/courts`
- `POST  /api/admin/courts`
- `PATCH /api/admin/courts/:id`
- `GET   /api/admin/bookings?date=&courtId=&status=`
- `PATCH /api/admin/bookings/:id/cancel`

## How double-booking is prevented

Three layers, per the spec:

1. **Availability endpoint** only returns a slot as `available: true` if no
   confirmed booking already occupies that court/date/time and the slot
   isn't in the past.
2. **Booking creation** re-checks availability server-side inside an immediate
   SQLite transaction, using interval overlap checks. This protects custom
   durations such as 15, 30, 45, or 90 minutes.
3. **Database constraint**: a partial unique index —
   `UNIQUE (courtId, bookingDate, startTime) WHERE status = 'confirmed'` —
   remains as an extra guard for exact-start conflicts. If an insert still
   races past the app-level check, the DB rejects it and the API returns the
   same `409 "This court is already booked for the selected time."` error.

Cancelled bookings are excluded from the unique index, so a cancelled slot
frees up immediately.

## Business rules implemented

- Visitors can browse `/availability` without logging in; login is required to
  create a booking.
- Only active courts are bookable.
- Past dates and past time slots are rejected (both in the availability
  list and as a hard check on booking creation).
- Each court has its own booking duration, from 15 to 240 minutes in 15-minute
  increments.
- Each court can be configured as open on selected weekdays, Monday through
  Sunday.
- Slots are aligned to each court's opening/closing hours and duration.
- Admin-only pages (`/admin/*`) and APIs are protected by role, both in
  middleware (page redirects) and inside each admin API route.
- Clients can only cancel their own bookings; admins can cancel any booking.

## What's intentionally out of scope (per spec)

Online payments, SMS notifications, membership plans, coupons, recurring
bookings, advanced reporting, and a native mobile app.
