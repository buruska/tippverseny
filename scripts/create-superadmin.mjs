import "dotenv/config";

import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.SUPERADMIN_PASSWORD;
const name = process.env.SUPERADMIN_NAME?.trim() || "Burus Ákos";

if (!email) {
  console.error("Missing SUPERADMIN_EMAIL environment variable.");
  process.exit(1);
}

if (!password) {
  console.error("Missing SUPERADMIN_PASSWORD environment variable.");
  process.exit(1);
}

if (password.length < 12) {
  console.error("SUPERADMIN_PASSWORD must be at least 12 characters long.");
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 12);

const user = await prisma.user.upsert({
  where: { email },
  create: {
    email,
    name,
    passwordHash,
    role: UserRole.SUPERADMIN,
  },
  update: {
    name,
    passwordHash,
    role: UserRole.SUPERADMIN,
  },
  select: {
    id: true,
    email: true,
    name: true,
    role: true,
    createdAt: true,
    updatedAt: true,
  },
});

console.log(`Superadmin ready: ${user.email} (${user.role})`);

await prisma.$disconnect();
