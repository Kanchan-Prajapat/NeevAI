// src/routes/predictionRoutes.ts
import { Router, Request, Response } from "express";

const router = Router();

router.get("/", (req: Request, res: Response) => {
  res.json({ message: "Prediction routes placeholder" });
});

export default router;
