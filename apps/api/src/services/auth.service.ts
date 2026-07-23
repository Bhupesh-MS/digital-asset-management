import bcrypt from "bcryptjs";
import { UserRepository } from "../repositories/user.repository.js";
import { JwtService } from "./jwt.service.js";
import { HttpError } from "../utils/http-error.js";

export interface LoginRequest {
  id: unknown;
  password: unknown;
}

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService
  ) {}

  async login(request: LoginRequest) {
    const id = typeof request.id === "string" ? request.id.trim().toLowerCase() : "";
    const password = typeof request.password === "string" ? request.password : "";

    if (!id || !password) {
      throw new HttpError(400, "id and password are required");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id)) {
      throw new HttpError(400, "id must be a valid email address");
    }

    const user = await this.userRepository.findByEmail(id);
    if (!user || user.role !== "ADMIN") {
      throw new HttpError(401, "Invalid admin credentials");
    }

    const matches = await bcrypt.compare(password, user.password);
    if (!matches) {
      throw new HttpError(401, "Invalid password");
    }

    const token = this.jwtService.sign({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    return {
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      }
    };
  }
}
