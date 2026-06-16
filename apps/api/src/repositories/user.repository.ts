import type { PrismaClient } from "@dam/db";

export interface UserRecord {
  id: string;
  email: string;
  password: string;
  role: "ADMIN" | "USER";
}

export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true
      }
    });
  }
}
