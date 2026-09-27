import type { Prediction } from "../../../shared/types";


// =========================================================
// API BASE URL
// =========================================================

const ML_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "http://127.0.0.1:8000";


// =========================================================
// PROJECT PREDICTION
// =========================================================

export interface MLProjectPrediction {
  predicted_delay_months: number;
  predicted_cost_overrun_pct: number;
  predicted_cost_overrun_cr: number;
  predicted_risk_score: number;
  risk_category: string;
  model_version: string;
  feature_count: number;
}


export interface MLProjectPredictionResponse {
  success: boolean;

  project: {
    projectId: string;
    projectName: string;
    domain: string;
    state?: string;
  };

  snapshot: {
    snapshotId: string;
    reportType: string;
    reportPeriod: string;
    reportDate: string;
  };

  prediction: MLProjectPrediction;
}


// =========================================================
// GET PREDICTIONS BY PROJECT ID
// =========================================================

export const getPredictionsByProjectId =
  async (
    projectId: string
  ): Promise<Prediction[]> => {

    const cleanProjectId =
      projectId.trim();

    if (!cleanProjectId) {
      throw new Error(
        "Project ID is required."
      );
    }

    const response =
      await fetch(
        `${ML_API_BASE_URL}/api/predictions/project/${encodeURIComponent(
          cleanProjectId
        )}`
      );

    let data: unknown;

    try {
      data =
        await response.json();
    } catch {
      throw new Error(
        `Prediction API returned an invalid response (${response.status}).`
      );
    }

    if (!response.ok) {

      const detail =
        typeof data === "object" &&
        data !== null &&
        "detail" in data &&
        typeof (
          data as {
            detail?: unknown;
          }
        ).detail === "string"
          ? (
              data as {
                detail: string;
              }
            ).detail
          : `Prediction API failed with status ${response.status}.`;

      throw new Error(detail);
    }

    /*
     * The ML endpoint returns the current
     * prediction inside the `prediction`
     * property.
     *
     * ProjectDetails expects an array from
     * this legacy service function, so
     * preserve the existing contract.
     */

    if (
      typeof data === "object" &&
      data !== null &&
      "prediction" in data &&
      (
        data as {
          prediction?: unknown;
        }
      ).prediction
    ) {

      return [
        {
          ...(
            data as {
              prediction: Prediction;
            }
          ).prediction,

          projectId:
            cleanProjectId,
        } as Prediction,
      ];
    }

    return [];
  };


// =========================================================
// FASTAPI ML PROJECT PREDICTION
// =========================================================

export const getMLProjectPrediction =
  async (
    projectId: string
  ): Promise<MLProjectPredictionResponse> => {

    const cleanProjectId =
      projectId.trim();

    if (!cleanProjectId) {
      throw new Error(
        "Project ID is required."
      );
    }

    const response =
      await fetch(
        `${ML_API_BASE_URL}/api/predictions/project/${encodeURIComponent(
          cleanProjectId
        )}`
      );

    let data: unknown;

    try {
      data =
        await response.json();
    } catch {
      throw new Error(
        `Prediction API returned an invalid response (${response.status}).`
      );
    }

    if (!response.ok) {

      const detail =
        typeof data === "object" &&
        data !== null &&
        "detail" in data &&
        typeof (
          data as {
            detail?: unknown;
          }
        ).detail === "string"
          ? (
              data as {
                detail: string;
              }
            ).detail
          : `Prediction failed with status ${response.status}.`;

      throw new Error(detail);
    }

    return data as MLProjectPredictionResponse;
  };


// =========================================================
// TEMPORAL / NEXT-MONTH PROGRESS PREDICTION
// =========================================================

export interface TemporalProgressPrediction {
  predicted_next_month_physical_progress_pct: number;
  predicted_progress_change_pct: number;
  current_physical_progress_pct: number;
  model_version: string;
  feature_count: number;
  feature_columns: string[];
}


export interface TemporalProgressPredictionResponse {
  success: boolean;

  predictionType: string;

  project: {
    projectId: string;
    projectName: string;
    domain: string;
    state?: string;
  };

  snapshot: {
    snapshotId: string;
    reportType: string;
    reportPeriod: string;
    reportDate: string;
  };

  prediction: TemporalProgressPrediction;
}


export const getNextMonthProgressPrediction =
  async (
    projectId: string
  ): Promise<TemporalProgressPredictionResponse> => {

    const cleanProjectId =
      projectId.trim();

    if (!cleanProjectId) {
      throw new Error(
        "Project ID is required."
      );
    }

    const response =
      await fetch(
        `${ML_API_BASE_URL}/api/predictions/project/${encodeURIComponent(
          cleanProjectId
        )}/next-month-progress`
      );

    let data: unknown;

    try {
      data =
        await response.json();
    } catch {
      throw new Error(
        `Temporal prediction API returned an invalid response (${response.status}).`
      );
    }

    if (!response.ok) {

      const detail =
        typeof data === "object" &&
        data !== null &&
        "detail" in data &&
        typeof (
          data as {
            detail?: unknown;
          }
        ).detail === "string"
          ? (
              data as {
                detail: string;
              }
            ).detail
          : `Temporal prediction failed with status ${response.status}.`;

      throw new Error(detail);
    }

    return data as TemporalProgressPredictionResponse;
  };


// =========================================================
// WHAT-IF SCENARIO PREDICTION
// =========================================================

export interface WhatIfScenario {
  originalCostCr?: number;
  cumulativeExpenditureCr?: number;
  physicalProgressPct?: number;

  totalMilestones?: number;
  completedMilestones?: number;
  delayedMilestones?: number;

  landAcquisitionDelayMonths?: number;
  clearanceDelayMonths?: number;

  contractorDelayScore?: number;
  geologicalDelayScore?: number;
}


export interface MLScenarioPredictionResponse {
  success: boolean;
  simulation: boolean;

  project: {
    projectId: string;
    projectName: string;
    domain: string;
    state?: string;
  };

  snapshot: {
    snapshotId: string;
    reportType: string;
    reportPeriod: string;
    reportDate: string;
  };

  prediction: MLProjectPrediction;

  overrides: WhatIfScenario;
}


export const runWhatIfPrediction =
  async (
    projectId: string,
    scenario: WhatIfScenario
  ): Promise<MLScenarioPredictionResponse> => {

    const cleanProjectId =
      projectId.trim();

    if (!cleanProjectId) {
      throw new Error(
        "Project ID is required."
      );
    }

    const response =
      await fetch(
        `${ML_API_BASE_URL}/api/predictions/simulate?project_id=${encodeURIComponent(
          cleanProjectId
        )}`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body:
            JSON.stringify(
              scenario
            ),
        }
      );

    let data: unknown;

    try {
      data =
        await response.json();
    } catch {
      throw new Error(
        `What-if API returned an invalid response (${response.status}).`
      );
    }

    if (!response.ok) {

      const detail =
        typeof data === "object" &&
        data !== null &&
        "detail" in data &&
        typeof (
          data as {
            detail?: unknown;
          }
        ).detail === "string"
          ? (
              data as {
                detail: string;
              }
            ).detail
          : `What-if prediction failed with status ${response.status}.`;

      throw new Error(detail);
    }

    return data as MLScenarioPredictionResponse;
  };