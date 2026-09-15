import type {
  RiskLevel,
  HealthStatus,
  DataStatus,
  AnalyticsStatus,
} from "../constants";

import type { TimestampValue } from "./common";

export interface ProjectAnalytics {
  projectId: string;

  physicalProgress?: number;
  financialProgress?: number;

  costVariance?: number;
  scheduleVariance?: number;

  actualVelocity?: number;
  expectedVelocity?: number;

  overallRiskScore?: number;
  riskLevel?: RiskLevel;

  healthStatus?: HealthStatus;

  dataStatus: DataStatus;

  analyticsStatus: AnalyticsStatus;

  computedAt?: TimestampValue;
}