import { prisma } from "@dam/db";
import { logger } from "@dam/logger";

export async function seedAdmin() {
  try {
    const adminEmail = "admin@gmail.com";
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (!existingAdmin) {
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: "$2b$10$Im0Cvcog8xo17EJK0rnJIeesJp9l1BXBinpNhYiNCcoQwEvJCQaGG",
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
