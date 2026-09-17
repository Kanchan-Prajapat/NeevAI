import type { TimestampValue } from "./common";

export type ReportType =
  | "Monthly"
  | "Quarterly"
  | "Other";

export type HealthStatus =
  | "Healthy"
  | "Warning"
  | "Critical"
  | "Unknown";

export interface ProjectSnapshot {
  id?: string;

  projectId: string;

  reportType: ReportType;

  reportPeriod: string;

  reportDate: TimestampValue | string;

  originalCostCr?: number | null;

  revisedCostCr?: number | null;

  anticipatedCostCr?: number | null;

  cumulativeExpenditureCr?: number | null;

  physicalProgressPct?: number | null;

  healthStatus?: HealthStatus;

  originalCompletionDate?:
    | TimestampValue
    | string
    | null;

  revisedCompletionDate?:
    | TimestampValue
    | string
    | null;

  anticipatedCompletionDate?:
    | TimestampValue
    | string
    | null;

  projectStatus?: string;

  remarks?: string;

  sourceReport: string;

  sourcePage?: string | number | null;

  createdAt?: TimestampValue;

  updatedAt?: TimestampValue;

    // ML / project execution inputs
  totalMilestones?: number | null;
  completedMilestones?: number | null;
  delayedMilestones?: number | null;

  landAcquisitionDelayMonths?: number | null;
  clearanceDelayMonths?: number | null;

  contractorDelayScore?: number | null;
  geologicalDelayScore?: number | null;
}