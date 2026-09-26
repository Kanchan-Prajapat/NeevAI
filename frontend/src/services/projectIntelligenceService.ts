export interface ProjectIntelligenceEvidence {
  category: string;
  severity: "High" | "Medium" | "Low";
  finding: string;
}

export interface ProjectIntelligenceAction {
  priority: number;
  urgency: "High" | "Medium" | "Low";
  action: string;
  reason: string;
}

export interface ProjectIntelligenceResponse {
  success: boolean;
  project: {
    projectId: string;
    projectName: string;
    domain: string;
    state: string;
  };
  query: string;
  answer: string;
  prediction?: {
    predicted_delay_months?: number;
    predicted_cost_overrun_pct?: number;
    predicted_cost_overrun_cr?: number;
    predicted_risk_score?: number;
    risk_category?: string;
  };
  intelligence?: {
    executive_summary?: string;
    risk_tier?: string;
    risk_score?: number;
    predicted_delay_months?: number;
    predicted_cost_overrun_pct?: number;
    predicted_cost_overrun_cr?: number;
    evidence?: ProjectIntelligenceEvidence[];
    recommended_actions?: ProjectIntelligenceAction[];
  };
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const askProjectIntelligence = async (
  projectId: string,
  query: string
): Promise<ProjectIntelligenceResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/api/project-intelligence/${projectId}/ask`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
      }),
    }
  );

  if (!response.ok) {
    let errorMessage = "Project intelligence request failed.";

    try {
      const errorData = await response.json();

      if (typeof errorData?.detail === "string") {
        errorMessage = errorData.detail;
      } else if (typeof errorData?.message === "string") {
        errorMessage = errorData.message;
      }
    } catch {
      // Keep default error message.
    }

    throw new Error(errorMessage);
  }

  return response.json();
};