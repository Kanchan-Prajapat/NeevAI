// src/routes/analyticsRoutes.ts
import { Router, Request, Response } from "express";

const router = Router();

router.get("/overview", (req: Request, res: Response) => {
  res.json({ message: "Analytics overview placeholder" });
});

export default router;
