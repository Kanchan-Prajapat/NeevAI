// src/routes/riskRoutes.ts
import { Router, Request, Response } from "express";

const router = Router();

router.get("/", (req: Request, res: Response) => {
  res.json({ message: "Risk routes placeholder" });
});

export default router;
