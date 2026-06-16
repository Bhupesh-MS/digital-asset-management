import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "@dam/db";
import { UserRepository } from "../repositories/user.repository.js";
import { JwtService } from "../services/jwt.service.js";
import { AuthService } from "../services/auth.service.js";
import { AuthController } from "../controllers/auth.controller.js";

export function createAuthRouter() {
  const router = Router();
  const repository = new UserRepository(prisma);
  const jwtService = new JwtService();
  const service = new AuthService(repository, jwtService);
  const controller = new AuthController(service);

  /**
   * @openapi
   * /auth/login:
   *   post:
   *     summary: Login to get access token
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               id:
   *                 type: string
   *                 description: Email address of the user
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Login successful
   *       401:
   *         description: Invalid credentials
   */
  router.post("/login", asyncHandler(controller.login));

  return router;
}

function asyncHandler(handler: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}
