import { prisma } from "@dam/db";
import { logger } from "@dam/logger";
import bcrypt from "bcryptjs";

const DEFAULT_ADMIN_PASSWORD = "Admin@123"; // Default password for the seeded admin user.

export async function seedAdmin() {
  try {
    const adminEmail = "admin@gmail.com";

    // Delete all existing users from the database
    const deletedUsers = await prisma.user.deleteMany();
    console.log(`Deleted ${deletedUsers.count} users from the database.`);

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);

      await prisma.user.create({
        data: {
          email: adminEmail,
          password: passwordHash,
          role: "ADMIN"
        }
      });
      logger.info("Default admin user seeded successfully.");
    } else {
      logger.info("Admin user already exists.");
    }
  } catch (error) {
    logger.error({ err: error }, "Failed to seed admin user");
  }
}
