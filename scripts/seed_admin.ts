import fs from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";

const DB_FILE = path.join(process.cwd(), "database.json");

async function main() {
  const data = await fs.readFile(DB_FILE, "utf-8");
  const db = JSON.parse(data);

  const adminEmail = "admin@test.com";
  const existing = db.users.find((u: any) => u.email.toLowerCase() === adminEmail.toLowerCase());

  if (existing) {
    console.log("Admin user already exists.");
    return;
  }

  const passwordHash = await bcrypt.hash("password123", 10);
  const newUser = {
    id: `user-${Date.now()}`,
    name: "Admin Test",
    email: adminEmail,
    passwordHash: passwordHash,
    role: "OWNER",
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  console.log("Admin user seeded successfully. Email: admin@test.com, Password: password123");
}

main().catch(console.error);
