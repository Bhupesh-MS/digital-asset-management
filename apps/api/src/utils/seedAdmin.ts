import { prisma } from "@dam/db";
import { logger } from "@dam/logger";

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
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: "$2y$10$r3OdARLlfsd0vdcbP8Yv4e3XAn.VintmppveRn0qk/hRBzd6Ifi/u", // Admin@123
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
