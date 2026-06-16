import type { Request, Response } from "express";
import { AuthService } from "../services/auth.service.js";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  login = async (req: Request, res: Response) => {
    res.json(await this.authService.login(req.body));
  };
}
