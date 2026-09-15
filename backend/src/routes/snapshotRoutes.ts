// src/routes/snapshotRoutes.ts
import { Router, Request, Response } from "express";

const router = Router();

router.get("/snapshots", (req: Request, res: Response) => {
  res.json({ message: "Snapshot routes placeholder" });
});

export default router;
