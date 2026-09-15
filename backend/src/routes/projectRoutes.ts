// src/routes/projectRoutes.ts
import { Router, Request, Response } from "express";

const router = Router();

// Placeholder GET route
router.get("/", (req: Request, res: Response) => {
  res.json({ message: "Project routes placeholder" });
});

export default router;
