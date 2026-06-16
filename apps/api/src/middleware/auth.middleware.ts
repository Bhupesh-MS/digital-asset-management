import type { NextFunction, Request, Response } from "express";
import { JwtService, type JwtUser } from "../services/jwt.service.js";
import { HttpError } from "../utils/http-error.js";

export interface AuthenticatedRequest extends Request {
  user?: JwtUser;
}

export function requireAdmin(jwtService = new JwtService()) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";

    if (!token) {
      next(new HttpError(401, "Authorization bearer token is required"));
      return;
    }

    const user = jwtService.verify(token);
    if (user.role !== "ADMIN") {
      next(new HttpError(403, "Admin access is required"));
      return;
    }

    req.user = user;
    next();
  };
}

export function optionalAuth(jwtService = new JwtService()) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";

    if (token) {
      req.user = jwtService.verify(token);
    }

    next();
  };
}
