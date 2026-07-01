import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { DEFAULT_SLOT_DURATION_MINUTES, openDaysToDb } from "./court-schedule";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "app.db");

// Reuse a single connection across hot-reloads in dev
const globalForDb = globalThis as unknown as { __db?: DatabaseSync };

export const db = globalForDb.__db ?? new DatabaseSync(DB_PATH);
if (process.env.NODE_ENV !== "production") globalForDb.__db = db;

db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA journal_mode = WAL;");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK(role IN ('client','admin')),
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS courts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  courtNumber INTEGER NOT NULL,
  name TEXT NOT NULL,
  sportType TEXT NOT NULL,
  openingTime TEXT NOT NULL,
  closingTime TEXT NOT NULL,
  slotDurationMinutes INTEGER NOT NULL DEFAULT 60 CHECK(slotDurationMinutes >= 15 AND slotDurationMinutes % 15 = 0),
  openDays TEXT NOT NULL DEFAULT '[1,2,3,4,5,6,0]',
  price REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('active','inactive')) DEFAULT 'active',
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL REFERENCES users(id),
  courtId INTEGER NOT NULL REFERENCES courts(id),
  bookingDate TEXT NOT NULL,
  startTime TEXT NOT NULL,
  endTime TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('confirmed','cancelled','completed')) DEFAULT 'confirmed',
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Enforced at the database level: only one CONFIRMED booking can exist
-- for a given court/date/startTime. Cancelled bookings don't count.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_booking
  ON bookings(courtId, bookingDate, startTime)
  WHERE status = 'confirmed';

CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(userId);
CREATE INDEX IF NOT EXISTS idx_bookings_court_date ON bookings(courtId, bookingDate);
`);

function addColumnIfMissing(table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!columns.some((existingColumn) => existingColumn.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition};`);
  }
}

addColumnIfMissing(
  "courts",
  "slotDurationMinutes",
  `slotDurationMinutes INTEGER NOT NULL DEFAULT ${DEFAULT_SLOT_DURATION_MINUTES} CHECK(slotDurationMinutes >= 15 AND slotDurationMinutes % 15 = 0)`
);
addColumnIfMissing("courts", "openDays", `openDays TEXT NOT NULL DEFAULT '${openDaysToDb(undefined)}'`);
addColumnIfMissing("courts", "price", `price REAL NOT NULL DEFAULT 0`);
addColumnIfMissing("bookings", "price", `price REAL NOT NULL DEFAULT 0`);

export type Role = "client" | "admin";
export type CourtStatus = "active" | "inactive";
export type BookingStatus = "confirmed" | "cancelled" | "completed";

export interface UserRow {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  phone: string | null;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface CourtRow {
  id: number;
  courtNumber: number;
  name: string;
  sportType: string;
  openingTime: string;
  closingTime: string;
  slotDurationMinutes: number;
  openDays: string;
  price: number;
  status: CourtStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BookingRow {
  id: number;
  userId: number;
  courtId: number;
  bookingDate: string;
  startTime: string;
  endTime: string;
  price: number;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
}
