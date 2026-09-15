// src/app.ts
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import healthRouter from "./routes/health";
import projectRouter from "./routes/projectRoutes";
import snapshotRouter from "./routes/snapshotRoutes";
import analyticsRouter from "./routes/analyticsRoutes";
import riskRouter from "./routes/riskRoutes";
import comparisonRouter from "./routes/comparisonRoutes";
import predictionRouter from "./routes/predictionRoutes";
import errorHandler from "./middleware/errorHandler";

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// API version prefix
const apiPrefix = "/api/v1";

app.use(`${apiPrefix}/health`, healthRouter);
app.use(`${apiPrefix}/projects`, projectRouter);
app.use(`${apiPrefix}/projects`, snapshotRouter); // snapshot routes are nested under projects
app.use(`${apiPrefix}/analytics`, analyticsRouter);
app.use(`${apiPrefix}/risk`, riskRouter);
app.use(`${apiPrefix}/comparison`, comparisonRouter);
app.use(`${apiPrefix}/predictions`, predictionRouter);

// Global error handler
app.use(errorHandler);

export default app;
