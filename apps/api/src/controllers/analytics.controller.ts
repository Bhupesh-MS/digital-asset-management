import type { Request, Response } from "express";
import { AnalyticsService } from "../services/analytics.service.js";

export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  dashboard = async (_req: Request, res: Response) => {
    res.json(await this.analyticsService.getDashboard());
  };
}
