import type {
  ProjectSnapshot,
} from "../../../shared/types";


// ==================================================
// API BASE URL
// ==================================================

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";


// ==================================================
// RECALCULATION RESPONSE
// ==================================================

export interface RecalculateProjectResponse {
  success: boolean;

  projectId: string;

  snapshotId: string;

  derivedMetricId: string;

  derivedMetric: {
    financialProgress: number;
    physicalProgress: number;
    costVariance: number;
    expectedVelocity: number;
    actualVelocity: number;
    scheduleVariance: number;

    riskComponents: {
      costRisk: number;
      scheduleRisk: number;
      velocityRisk: number;
      efficiencyRisk: number;
    };

    overallRiskScore: number;
    riskLevel: string;
  };
}


// ==================================================
// RECALCULATE PROJECT
// ==================================================

export const recalculateProject =
  async (
    projectId: string
  ): Promise<RecalculateProjectResponse> => {

    const cleanProjectId =
      projectId.trim();

    if (!cleanProjectId) {
      throw new Error(
        "Project ID is required."
      );
    }

    const response =
      await fetch(
        `${API_BASE_URL}/api/projects/${encodeURIComponent(
          cleanProjectId
        )}/recalculate`,
        {
          method: "POST",
        }
      );

    let data: unknown;

    try {
      data =
        await response.json();
    } catch {
      throw new Error(
        `Recalculation API returned an invalid response (${response.status}).`
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
          : `Recalculation failed with status ${response.status}.`;

      throw new Error(detail);
    }

    if (
      typeof data !== "object" ||
      data === null ||
      !("success" in data) ||
      (
        data as {
          success?: unknown;
        }
      ).success !== true
    ) {
      throw new Error(
        "Recalculation API returned an unsuccessful response."
      );
    }

    return data as RecalculateProjectResponse;
  };