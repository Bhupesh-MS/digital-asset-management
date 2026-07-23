import { prisma } from "@dam/db";
import { logger } from "@dam/logger";
import bcrypt from "bcryptjs";

const DEFAULT_ADMIN_EMAIL = "admin@gmail.com";
const DEFAULT_ADMIN_PASSWORD = "Admin@123";

export async function seedAdmin() {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      logger.warn("Skipping admin seed because ADMIN_EMAIL or ADMIN_PASSWORD is empty");
      return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        password: passwordHash,
        role: "ADMIN"
      },
      create: {
        email: adminEmail,
        password: passwordHash,
        role: "ADMIN"
      }
    });

    logger.info({ adminEmail }, "Admin user seeded successfully.");
  } catch (error) {
    logger.error({ err: error }, "Failed to seed admin user");
    throw error;
  }
}
