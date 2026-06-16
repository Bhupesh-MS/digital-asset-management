import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { HttpError } from "../utils/http-error.js";

export interface JwtUser {
  userId: string;
  email: string;
  role: "ADMIN" | "USER";
}

export class JwtService {
  private readonly secret: Secret;
  private readonly expiresIn: SignOptions["expiresIn"];

  constructor(secret = process.env.JWT_SECRET, expiresIn: SignOptions["expiresIn"] = "1h") {
    if (!secret) {
      throw new Error("JWT_SECRET is required");
    }

    this.secret = secret;
    this.expiresIn = expiresIn;
  }

  sign(user: JwtUser): string {
    return jwt.sign(user, this.secret, {
      expiresIn: this.expiresIn,
      subject: user.userId
    });
  }

  verify(token: string): JwtUser {
    try {
      const payload = jwt.verify(token, this.secret) as JwtUser;
      if (!payload.userId || !payload.email || !payload.role) {
        throw new Error("Invalid token payload");
      }

      return payload;
    } catch {
      throw new HttpError(401, "Invalid or expired token");
    }
  }
}
