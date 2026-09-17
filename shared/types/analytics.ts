import type { TimestampValue } from "./common";

export type RiskLevel =
  | "Low"
  | "Medium"
  | "High"
  | "Critical";

export interface RiskComponents {
  costRisk: number;
  scheduleRisk: number;
  velocityRisk: number;
  efficiencyRisk: number;
}

export interface DerivedMetric {
  id?: string;

  projectId: string;

  snapshotId?: string;

  financialProgress: number;

  physicalProgress: number;

  costVariance: number;

  expectedVelocity: number;

  actualVelocity: number;

  scheduleVariance: number;

  riskComponents?: RiskComponents;

  overallRiskScore: number;

  riskLevel: RiskLevel;

  computedAt: TimestampValue | string;

  createdAt?: TimestampValue;

  updatedAt?: TimestampValue;
}

export type RecalcStatus =
  | "started"
  | "completed"
  | "failed";

export interface RecalcLog {
  id?: string;

  projectId: string;

  status: RecalcStatus;

  startedAt: TimestampValue | string;

  endedAt?: TimestampValue | string;

  errorMessage?: string;

  computedAt?: TimestampValue | string;

  createdAt?: TimestampValue;

  updatedAt?: TimestampValue;
}