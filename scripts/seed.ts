import { db } from "../lib/db";
import { hashPassword } from "../lib/auth";
import { formatDate } from "../lib/slots";

async function main() {
  console.log("Seeding database...");

  // Wipe existing data so the script is safely re-runnable.
  db.exec("DELETE FROM bookings; DELETE FROM courts; DELETE FROM users;");

  const adminPasswordHash = await hashPassword("Admin123!");
  const clientPasswordHash = await hashPassword("Client123!");

  const adminResult = db
    .prepare(
      `INSERT INTO users (name, email, passwordHash, phone, role) VALUES (?, ?, ?, ?, 'admin')`
    )
    .run("Alex Admin", "admin@courtbooking.test", adminPasswordHash, "555-0100");

  const clientResult = db
    .prepare(
      `INSERT INTO users (name, email, passwordHash, phone, role) VALUES (?, ?, ?, ?, 'client')`
    )
    .run("Casey Client", "client@courtbooking.test", clientPasswordHash, "555-0200");

  const clientId = Number(clientResult.lastInsertRowid);
  void adminResult;

  const court1 = db
    .prepare(
      `INSERT INTO courts (courtNumber, name, sportType, openingTime, closingTime, slotDurationMinutes, openDays, price, status)
       VALUES (1, 'Court 1', 'Basketball', '08:00', '22:00', 60, '[1,2,3,4,5,6,0]', 25, 'active')`
    )
    .run();
  const court2 = db
    .prepare(
      `INSERT INTO courts (courtNumber, name, sportType, openingTime, closingTime, slotDurationMinutes, openDays, price, status)
       VALUES (2, 'Court 2', 'Tennis', '07:00', '21:00', 30, '[1,2,3,4,5]', 18, 'active')`
    )
    .run();
  db.prepare(
    `INSERT INTO courts (courtNumber, name, sportType, openingTime, closingTime, slotDurationMinutes, openDays, price, status)
     VALUES (3, 'Court 3', 'Badminton', '09:00', '20:00', 45, '[6,0]', 15, 'inactive')`
  ).run();

  const court1Id = Number(court1.lastInsertRowid);
  const court2Id = Number(court2.lastInsertRowid);

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  db.prepare(
    `INSERT INTO bookings (userId, courtId, bookingDate, startTime, endTime, price, status)
     VALUES (?, ?, ?, ?, ?, ?, 'confirmed')`
  ).run(clientId, court1Id, formatDate(tomorrow), "10:00", "11:00", 25);

  db.prepare(
    `INSERT INTO bookings (userId, courtId, bookingDate, startTime, endTime, price, status)
     VALUES (?, ?, ?, ?, ?, ?, 'confirmed')`
  ).run(clientId, court2Id, formatDate(nextWeek), "15:00", "15:30", 18);

  db.prepare(
    `INSERT INTO bookings (userId, courtId, bookingDate, startTime, endTime, price, status)
     VALUES (?, ?, ?, ?, ?, ?, 'cancelled')`
  ).run(clientId, court1Id, formatDate(tomorrow), "14:00", "15:00", 25);

  console.log("Seed complete.");
  console.log("  Admin login:  admin@courtbooking.test / Admin123!");
  console.log("  Client login: client@courtbooking.test / Client123!");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
