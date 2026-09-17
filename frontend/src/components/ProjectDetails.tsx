import { useEffect, useState } from "react";

import type {
  Project,
  ProjectSnapshot,
  Prediction,
} from "../../../shared/types";


import {
  getBenchmarkProjects,
  type BenchmarkProject,
} from "../services/benchmarkService";

import {
  getDashboardAnalytics,
} from "../services/projectAnalyticsService";

import type {
  DashboardAnalytics,
} from "../services/projectAnalyticsService";

import {
  getAllProjectSnapshots,
} from "../services/projectSnapshotService";

import {
  getPredictionsByProjectId,
  getMLProjectPrediction,
} from "../services/predictionService";

import type {
  MLProjectPredictionResponse,
} from "../services/predictionService";

import "./ProjectDetails.css";


interface ProjectDetailsProps {
  project: Project;
  onBack: () => void;
  onEdit: () => void;
  onAddSnapshot?: () => void;
}



/* =========================================
   DATE CONVERSION
========================================= */

const formatDate = (
  value: unknown
): string => {

  if (!value) {
    return "Not available";
  }


  if (value instanceof Date) {

    return value.toLocaleDateString(
      "en-IN"
    );

  }


  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (
      value as {
        toDate?: unknown;
      }
    ).toDate === "function"
  ) {

    return (
      value as {
        toDate: () => Date;
      }
    )
      .toDate()
      .toLocaleDateString(
        "en-IN"
      );

  }


  if (typeof value === "string") {

    const date =
      new Date(value);


    if (!Number.isNaN(
      date.getTime()
    )) {

      return date.toLocaleDateString(
        "en-IN"
      );

    }


    return value;

  }


  return "Not available";

};


/* =========================================
   TIMESTAMP COMPARISON
========================================= */

const getTimestampMilliseconds = (
  value: unknown
): number => {

  if (!value) {
    return 0;
  }


  if (value instanceof Date) {
    return value.getTime();
  }


  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (
      value as {
        toDate?: unknown;
      }
    ).toDate === "function"
  ) {

    return (
      value as {
        toDate: () => Date;
      }
    )
      .toDate()
      .getTime();

  }


  if (typeof value === "string") {

    const time =
      new Date(value).getTime();


    return Number.isNaN(time)
      ? 0
      : time;

  }


  return 0;

};


/* =========================================
   GET LATEST SNAPSHOT
========================================= */

const getLatestSnapshot = (
  snapshots: ProjectSnapshot[]
): ProjectSnapshot | null => {

  if (snapshots.length === 0) {
    return null;
  }


  return snapshots.reduce(
    (
      latest,
      current
    ) => {

      const latestTime =
        getTimestampMilliseconds(
          latest.reportDate
        );


      const currentTime =
        getTimestampMilliseconds(
          current.reportDate
        );


      return currentTime > latestTime
        ? current
        : latest;

    }
  );

};


/* =========================================
   EARLY WARNING ENGINE
========================================= */

interface EarlyWarning {
  title: string;
  message: string;
  severity: "high" | "medium" | "low";
}


const generateEarlyWarnings = (
  snapshot: ProjectSnapshot | null,
  mlResult: MLProjectPredictionResponse | null
): EarlyWarning[] => {

  if (!snapshot) {
    return [];
  }

  const warnings: EarlyWarning[] = [];


  


  /* -----------------------------------------
     COST WARNING
  ----------------------------------------- */

  const originalCost =
    snapshot.originalCostCr ?? null;

  const revisedCost =
    snapshot.revisedCostCr ?? null;


  if (
    originalCost !== null &&
    revisedCost !== null &&
    originalCost > 0
  ) {

    const costIncrease =
      ((revisedCost - originalCost) /
        originalCost) *
      100;


    if (costIncrease >= 10) {

      warnings.push({
        title: "Cost Escalation Risk",
        message:
          `Project cost has increased by ${costIncrease.toFixed(1)}% compared with the original approved cost.`,
        severity: "high",
      });

    } else if (costIncrease >= 5) {

      warnings.push({
        title: "Cost Escalation Watch",
        message:
          `Project cost has increased by ${costIncrease.toFixed(1)}% compared with the original approved cost.`,
        severity: "medium",
      });

    }

  }



  /* -----------------------------------------
     PHYSICAL PROGRESS
  ----------------------------------------- */

  const physicalProgress =
    snapshot.physicalProgressPct;


  if (
    typeof physicalProgress === "number" &&
    physicalProgress < 50
  ) {

    warnings.push({
      title: "Execution Progress Risk",
      message:
        `Physical progress is currently ${physicalProgress.toFixed(1)}%. Project execution should be monitored closely.`,
      severity:
        physicalProgress < 25
          ? "high"
          : "medium",
    });

  }


  /* -----------------------------------------
     MILESTONE WARNING
  ----------------------------------------- */

  const totalMilestones =
    snapshot.totalMilestones;

  const delayedMilestones =
    snapshot.delayedMilestones;


  if (
    typeof totalMilestones === "number" &&
    totalMilestones > 0 &&
    typeof delayedMilestones === "number"
  ) {

    const delayedRatio =
      (delayedMilestones /
        totalMilestones) *
      100;


    if (delayedRatio >= 30) {

      warnings.push({
        title: "Milestone Delay Risk",
        message:
          `${delayedMilestones} of ${totalMilestones} milestones are delayed (${delayedRatio.toFixed(1)}%).`,
        severity:
          delayedRatio >= 50
            ? "high"
            : "medium",
      });

    }

  }


  /* -----------------------------------------
     LAND ACQUISITION
  ----------------------------------------- */

  const landDelay =
    snapshot.landAcquisitionDelayMonths;


  if (
    typeof landDelay === "number" &&
    landDelay > 0
  ) {

    warnings.push({
      title: "Land Acquisition Delay",
      message:
        `Land acquisition is contributing approximately ${landDelay.toFixed(1)} months of delay.`,
      severity:
        landDelay >= 6
          ? "high"
          : "medium",
    });

  }


  /* -----------------------------------------
     CLEARANCE
  ----------------------------------------- */

  const clearanceDelay =
    snapshot.clearanceDelayMonths;


  if (
    typeof clearanceDelay === "number" &&
    clearanceDelay > 0
  ) {

    warnings.push({
      title: "Clearance Delay",
      message:
        `Clearance-related delays account for approximately ${clearanceDelay.toFixed(1)} months.`,
      severity:
        clearanceDelay >= 6
          ? "high"
          : "medium",
    });

  }


  /* -----------------------------------------
     ML PREDICTION WARNING
  ----------------------------------------- */

  if (mlResult) {

    const predictedDelay =
      mlResult.prediction
        .predicted_delay_months;


    if (
      typeof predictedDelay === "number" &&
      predictedDelay >= 6
    ) {

      warnings.push({
        title: "AI Predicted Schedule Risk",
        message:
          `The ML model predicts approximately ${predictedDelay.toFixed(1)} months of potential delay.`,
        severity:
          predictedDelay >= 12
            ? "high"
            : "medium",
      });

    }


    const riskScore =
      mlResult.prediction
        .predicted_risk_score;


    if (
      typeof riskScore === "number" &&
      riskScore > 50
    ) {

      warnings.push({
        title: "AI Risk Alert",
        message:
          `The AI risk score is ${riskScore.toFixed(1)} / 100.`,
        severity:
          riskScore > 75
            ? "high"
            : "medium",
      });

    }

  }


  return warnings;
};




interface ExplanationFactor {
  title: string;
  value: string;
  impact: "high" | "medium" | "low";
  explanation: string;
}

const generateExplanationFactors = (
  snapshot: ProjectSnapshot | null,
  mlResult: MLProjectPredictionResponse | null
): ExplanationFactor[] => {
  if (!snapshot || !mlResult) return [];

  const factors: ExplanationFactor[] = [];

  // Cost factor
  const originalCost = snapshot.originalCostCr ?? null;
  const revisedCost = snapshot.revisedCostCr ?? null;

  if (
    originalCost !== null &&
    revisedCost !== null &&
    originalCost > 0
  ) {
    const costIncrease =
      ((revisedCost - originalCost) / originalCost) * 100;

    if (costIncrease > 0) {
      factors.push({
        title: "Cost Escalation",
        value: `${costIncrease.toFixed(1)}%`,
        impact: costIncrease >= 10 ? "high" : "medium",
        explanation:
          "Increase in project cost compared with the original approved cost contributes to project risk.",
      });
    }
  }

  // Physical progress
  const physicalProgress = snapshot.physicalProgressPct;

  if (typeof physicalProgress === "number") {
    factors.push({
      title: "Physical Progress",
      value: `${physicalProgress.toFixed(1)}%`,
      impact:
        physicalProgress < 50
          ? "high"
          : physicalProgress < 75
          ? "medium"
          : "low",
      explanation:
        physicalProgress < 50
          ? "Lower physical progress indicates slower execution and increases schedule-related concern."
          : "Current physical progress does not indicate a major execution concern.",
    });
  }

  // Milestone delays
  const totalMilestones = snapshot.totalMilestones;
  const delayedMilestones = snapshot.delayedMilestones;

  if (
    typeof totalMilestones === "number" &&
    totalMilestones > 0 &&
    typeof delayedMilestones === "number"
  ) {
    const delayedRatio =
      (delayedMilestones / totalMilestones) * 100;

    factors.push({
      title: "Delayed Milestones",
      value: `${delayedMilestones}/${totalMilestones}`,
      impact:
        delayedRatio >= 50
          ? "high"
          : delayedRatio >= 30
          ? "medium"
          : "low",
      explanation:
        `${delayedRatio.toFixed(1)}% of recorded milestones are delayed, which can contribute to schedule risk.`,
    });
  }

  // Land acquisition
  const landDelay = snapshot.landAcquisitionDelayMonths;

  if (typeof landDelay === "number" && landDelay > 0) {
    factors.push({
      title: "Land Acquisition Delay",
      value: `${landDelay.toFixed(1)} months`,
      impact: landDelay >= 6 ? "high" : "medium",
      explanation:
        "Land acquisition delays can directly affect project execution and completion timelines.",
    });
  }

  // Clearance
  const clearanceDelay = snapshot.clearanceDelayMonths;

  if (typeof clearanceDelay === "number" && clearanceDelay > 0) {
    factors.push({
      title: "Clearance Delay",
      value: `${clearanceDelay.toFixed(1)} months`,
      impact: clearanceDelay >= 6 ? "high" : "medium",
      explanation:
        "Clearance-related delays can create implementation bottlenecks and affect the project schedule.",
    });
  }

  // AI predicted delay
  const predictedDelay =
    mlResult.prediction.predicted_delay_months;

  if (typeof predictedDelay === "number") {
    factors.push({
      title: "AI Predicted Delay",
      value: `${predictedDelay.toFixed(1)} months`,
      impact:
        predictedDelay >= 12
          ? "high"
          : predictedDelay >= 6
          ? "medium"
          : "low",
      explanation:
        "The trained ML model estimates potential schedule delay using the project's available execution and financial features.",
    });
  }

  return factors;
};


interface CostDriver {
  title: string;
  value: string;
  impact: "high" | "medium" | "low";
  description: string;
}

const generateCostDrivers = (
  snapshot: ProjectSnapshot | null
): CostDriver[] => {
  if (!snapshot) return [];

  const drivers: CostDriver[] = [];

  const originalCost =
    snapshot.originalCostCr ?? null;

  const revisedCost =
    snapshot.revisedCostCr ?? null;

  // Overall cost escalation
  if (
    originalCost !== null &&
    revisedCost !== null &&
    originalCost > 0
  ) {
    const escalationPct =
      ((revisedCost - originalCost) /
        originalCost) *
      100;

    if (escalationPct > 0) {
      drivers.push({
        title: "Overall Cost Escalation",
        value: `${escalationPct.toFixed(1)}%`,
        impact:
          escalationPct >= 10
            ? "high"
            : escalationPct >= 5
            ? "medium"
            : "low",
        description:
          "Difference between the revised and original approved project cost.",
      });
    }
  }

  // Land acquisition
  const landDelay =
    snapshot.landAcquisitionDelayMonths;

  if (
    typeof landDelay === "number" &&
    landDelay > 0
  ) {
    drivers.push({
      title: "Land Acquisition Delay",
      value: `${landDelay.toFixed(1)} months`,
      impact:
        landDelay >= 6
          ? "high"
          : "medium",
      description:
        "Recorded land acquisition delay represents an execution factor that may contribute to additional project time and associated costs.",
    });
  }

  // Clearance
  const clearanceDelay =
    snapshot.clearanceDelayMonths;

  if (
    typeof clearanceDelay === "number" &&
    clearanceDelay > 0
  ) {
    drivers.push({
      title: "Clearance Delay",
      value: `${clearanceDelay.toFixed(1)} months`,
      impact:
        clearanceDelay >= 6
          ? "high"
          : "medium",
      description:
        "Recorded clearance-related delay represents a potential implementation bottleneck.",
    });
  }

  // Contractor delay
  const contractorDelay =
    snapshot.contractorDelayScore;

  if (
    typeof contractorDelay === "number" &&
    contractorDelay > 0
  ) {
    drivers.push({
      title: "Contractor Delay Factor",
      value: contractorDelay.toFixed(1),
      impact:
        contractorDelay >= 3
          ? "high"
          : contractorDelay >= 1.5
          ? "medium"
          : "low",
      description:
        "Recorded contractor delay score indicates execution friction associated with contractor performance.",
    });
  }

  // Geological delay
  const geologicalDelay =
    snapshot.geologicalDelayScore;

  if (
    typeof geologicalDelay === "number" &&
    geologicalDelay > 0
  ) {
    drivers.push({
      title: "Geological Delay Factor",
      value: geologicalDelay.toFixed(1),
      impact:
        geologicalDelay >= 3
          ? "high"
          : geologicalDelay >= 1.5
          ? "medium"
          : "low",
      description:
        "Recorded geological delay score represents a project execution factor related to site conditions.",
    });
  }

  // Milestone stress
  const totalMilestones =
    snapshot.totalMilestones;

  const delayedMilestones =
    snapshot.delayedMilestones;

  if (
    typeof totalMilestones === "number" &&
    totalMilestones > 0 &&
    typeof delayedMilestones === "number"
  ) {
    const delayedRatio =
      (delayedMilestones /
        totalMilestones) *
      100;

    if (delayedRatio > 0) {
      drivers.push({
        title: "Milestone Delay",
        value: `${delayedRatio.toFixed(1)}%`,
        impact:
          delayedRatio >= 50
            ? "high"
            : delayedRatio >= 30
            ? "medium"
            : "low",
        description:
          "Delayed milestones indicate execution pressure that can contribute to schedule extension and associated costs.",
      });
    }
  }

  return drivers;
};


interface RiskExplanation {
  factor: string;
  value: string;
  explanation: string;
  severity: "high" | "medium" | "low";
}

const generateRiskExplanations = (
  snapshot: ProjectSnapshot | null,
  mlResult: MLProjectPredictionResponse | null
): RiskExplanation[] => {
  if (!snapshot) return [];

  const explanations: RiskExplanation[] = [];

  /* COST FACTOR */
  const originalCost = snapshot.originalCostCr ?? null;
  const revisedCost = snapshot.revisedCostCr ?? null;

  if (
    originalCost !== null &&
    revisedCost !== null &&
    originalCost > 0
  ) {
    const costIncrease =
      ((revisedCost - originalCost) / originalCost) * 100;

    if (costIncrease > 0) {
      explanations.push({
        factor: "Cost Escalation",
        value: `${costIncrease.toFixed(1)}%`,
        explanation:
          "Revised project cost is higher than the original approved cost.",
        severity:
          costIncrease >= 10
            ? "high"
            : costIncrease >= 5
            ? "medium"
            : "low",
      });
    }
  }

  /* PHYSICAL PROGRESS */
  const physicalProgress =
    snapshot.physicalProgressPct;

  if (typeof physicalProgress === "number") {
    explanations.push({
      factor: "Physical Progress",
      value: `${physicalProgress.toFixed(1)}%`,
      explanation:
        physicalProgress < 50
          ? "Reported physical progress is below 50%, indicating slower execution."
          : "Reported physical progress indicates substantial project execution.",
      severity:
        physicalProgress < 25
          ? "high"
          : physicalProgress < 50
          ? "medium"
          : "low",
    });
  }

  /* MILESTONE DELAYS */
  const totalMilestones =
    snapshot.totalMilestones;

  const delayedMilestones =
    snapshot.delayedMilestones;

  if (
    typeof totalMilestones === "number" &&
    totalMilestones > 0 &&
    typeof delayedMilestones === "number"
  ) {
    const delayedRatio =
      (delayedMilestones / totalMilestones) * 100;

    explanations.push({
      factor: "Milestone Delays",
      value: `${delayedMilestones}/${totalMilestones}`,
      explanation:
        `${delayedRatio.toFixed(1)}% of recorded milestones are delayed.`,
      severity:
        delayedRatio >= 50
          ? "high"
          : delayedRatio >= 30
          ? "medium"
          : "low",
    });
  }

  /* LAND ACQUISITION */
  const landDelay =
    snapshot.landAcquisitionDelayMonths;

  if (
    typeof landDelay === "number" &&
    landDelay > 0
  ) {
    explanations.push({
      factor: "Land Acquisition",
      value: `${landDelay.toFixed(1)} months`,
      explanation:
        "Land acquisition delay is contributing to project execution pressure.",
      severity:
        landDelay >= 6
          ? "high"
          : "medium",
    });
  }

  /* CLEARANCE */
  const clearanceDelay =
    snapshot.clearanceDelayMonths;

  if (
    typeof clearanceDelay === "number" &&
    clearanceDelay > 0
  ) {
    explanations.push({
      factor: "Statutory Clearances",
      value: `${clearanceDelay.toFixed(1)} months`,
      explanation:
        "Clearance-related delay may affect project execution timelines.",
      severity:
        clearanceDelay >= 6
          ? "high"
          : "medium",
    });
  }

  /* AI PREDICTION */
  if (mlResult) {
    const predictedDelay =
      mlResult.prediction.predicted_delay_months;

    if (
      typeof predictedDelay === "number" &&
      predictedDelay > 0
    ) {
      explanations.push({
        factor: "AI Predicted Delay",
        value: `${predictedDelay.toFixed(1)} months`,
        explanation:
          "The trained ML model estimates potential schedule delay based on the available project features.",
        severity:
          predictedDelay >= 12
            ? "high"
            : predictedDelay >= 6
            ? "medium"
            : "low",
      });
    }

    const predictedCost =
      mlResult.prediction.predicted_cost_overrun_pct;

    if (
      typeof predictedCost === "number" &&
      predictedCost > 0
    ) {
      explanations.push({
        factor: "AI Cost Overrun",
        value: `${predictedCost.toFixed(2)}%`,
        explanation:
          "The trained ML model estimates potential cost overrun from the available project features.",
        severity:
          predictedCost >= 20
            ? "high"
            : predictedCost >= 10
            ? "medium"
            : "low",
      });
    }
  }

  return explanations;
};


interface ModelComparison {
  method: string;
  approach: string;
  strengths: string;
  limitation: string;
}

const modelComparisons: ModelComparison[] = [
  {
    method: "Conventional Statistical",
    approach:
      "Uses statistical relationships between project variables and the target outcome.",
    strengths:
      "High interpretability and useful for understanding direct relationships.",
    limitation:
      "May be less effective when relationships between multiple project factors are nonlinear.",
  },
  {
    method: "Machine Learning",
    approach:
      "Learns patterns across multiple project execution, financial and progress features.",
    strengths:
      "Can capture complex and nonlinear relationships between project indicators.",
    limitation:
      "Requires representative historical training data and validation.",
  },
  {
    method: "NeevAI Decision Layer",
    approach:
      "Combines ML predictions with risk scoring, early warnings and factor-based explanations.",
    strengths:
      "Converts predictions into project-level monitoring and decision support.",
    limitation:
      "Prediction quality depends on the availability and quality of project data.",
  },
];


interface ActionRecommendation {
  title: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

const generateRecommendations = (
  snapshot: ProjectSnapshot | null,
  mlResult: MLProjectPredictionResponse | null
): ActionRecommendation[] => {
  if (!snapshot) return [];

  const recommendations: ActionRecommendation[] = [];

  // 1. Land acquisition
  const landDelay =
    snapshot.landAcquisitionDelayMonths;

  if (
    typeof landDelay === "number" &&
    landDelay > 0
  ) {
    recommendations.push({
      title: "Review land acquisition bottlenecks",
      reason:
        `Land acquisition delay of ${landDelay.toFixed(1)} months is recorded in the latest project data.`,
      priority:
        landDelay >= 6
          ? "high"
          : "medium",
    });
  }

  // 2. Statutory clearances
  const clearanceDelay =
    snapshot.clearanceDelayMonths;

  if (
    typeof clearanceDelay === "number" &&
    clearanceDelay > 0
  ) {
    recommendations.push({
      title: "Review clearance-related bottlenecks",
      reason:
        `Clearance-related delay of ${clearanceDelay.toFixed(1)} months is recorded.`,
      priority:
        clearanceDelay >= 6
          ? "high"
          : "medium",
    });
  }

  // 3. Milestone intervention
  const totalMilestones =
    snapshot.totalMilestones;

  const delayedMilestones =
    snapshot.delayedMilestones;

  if (
    typeof totalMilestones === "number" &&
    totalMilestones > 0 &&
    typeof delayedMilestones === "number"
  ) {
    const delayedRatio =
      (delayedMilestones /
        totalMilestones) *
      100;

    if (delayedRatio >= 30) {
      recommendations.push({
        title: "Prioritise delayed milestones",
        reason:
          `${delayedMilestones} of ${totalMilestones} recorded milestones are delayed (${delayedRatio.toFixed(1)}%).`,
        priority:
          delayedRatio >= 50
            ? "high"
            : "medium",
      });
    }
  }

  // 4. Contractor execution
  const contractorDelay =
    snapshot.contractorDelayScore;

  if (
    typeof contractorDelay === "number" &&
    contractorDelay > 0
  ) {
    recommendations.push({
      title: "Review contractor execution",
      reason:
        `A contractor delay score of ${contractorDelay.toFixed(1)} is recorded in the latest snapshot.`,
      priority:
        contractorDelay >= 3
          ? "high"
          : "medium",
    });
  }

  // 5. Geological / site conditions
  const geologicalDelay =
    snapshot.geologicalDelayScore;

  if (
    typeof geologicalDelay === "number" &&
    geologicalDelay > 0
  ) {
    recommendations.push({
      title: "Review site-condition constraints",
      reason:
        `A geological delay score of ${geologicalDelay.toFixed(1)} is recorded.`,
      priority:
        geologicalDelay >= 3
          ? "high"
          : "medium",
    });
  }

  // 6. AI predicted schedule risk
  if (mlResult) {
    const predictedDelay =
      mlResult.prediction
        .predicted_delay_months;

    if (
      typeof predictedDelay === "number" &&
      predictedDelay >= 6
    ) {
      recommendations.push({
        title: "Initiate schedule review",
        reason:
          `The ML model predicts approximately ${predictedDelay.toFixed(1)} months of potential delay.`,
        priority:
          predictedDelay >= 12
            ? "high"
            : "medium",
      });
    }
  }

  // 7. Cost escalation review
  const originalCost =
    snapshot.originalCostCr ?? null;

  const revisedCost =
    snapshot.revisedCostCr ?? null;

  if (
    originalCost !== null &&
    revisedCost !== null &&
    originalCost > 0
  ) {
    const costIncrease =
      ((revisedCost - originalCost) /
        originalCost) *
      100;

    if (costIncrease >= 5) {
      recommendations.push({
        title: "Review cost escalation",
        reason:
          `Project cost has increased by ${costIncrease.toFixed(1)}% compared with the original approved cost.`,
        priority:
          costIncrease >= 10
            ? "high"
            : "medium",
      });
    }
  }

  // Highest priority recommendations first
  const priorityOrder = {
    high: 1,
    medium: 2,
    low: 3,
  };

  recommendations.sort(
    (a, b) =>
      priorityOrder[a.priority] -
      priorityOrder[b.priority]
  );

  return recommendations;
};
/* =========================================
   CRORE FORMAT
========================================= */

const formatCrore = (
  value?: number | null
): string => {

  if (
    value === undefined ||
    value === null
  ) {

    return "No Data";

  }


  return `₹ ${value.toLocaleString(
    "en-IN"
  )} Cr`;

};


/* =========================================
   COMPONENT
========================================= */

function ProjectDetails({
  project,
  onBack,
  onEdit,
  onAddSnapshot,
}: ProjectDetailsProps) {


  const [
    latestSnapshot,
    setLatestSnapshot,
  ] = useState<
    ProjectSnapshot | null
  >(null);


  const [
  mlPrediction,
  setMlPrediction,
] = useState<MLProjectPredictionResponse | null>(null);

const [
  mlPredictionLoading,
  setMlPredictionLoading,
] = useState(false);

const [
  mlPredictionError,
  setMlPredictionError,
] = useState<string | null>(null);

const [benchmarkProjects, setBenchmarkProjects] = useState<
  BenchmarkProject[]
>([]);

const [benchmarkLoading, setBenchmarkLoading] =
  useState(false);

const [benchmarkError, setBenchmarkError] =
  useState<string | null>(null);

const earlyWarnings = generateEarlyWarnings(
  latestSnapshot,
  mlPrediction
);

const riskExplanations =
  generateRiskExplanations(
    latestSnapshot,
    mlPrediction
  );

  const originalCost =
  latestSnapshot?.originalCostCr ??
  latestSnapshot?.revisedCostCr ??
  null;

const revisedCost =
  latestSnapshot?.revisedCostCr ??
  null;

const costIncreasePct =
  originalCost !== null &&
  revisedCost !== null &&
  originalCost > 0
    ? ((revisedCost - originalCost) / originalCost) * 100
    : null;

const costDrivers = generateCostDrivers(
  latestSnapshot
);

const recommendations = generateRecommendations(
  latestSnapshot,
  mlPrediction
);

const explanationFactors = generateExplanationFactors(
  latestSnapshot,
  mlPrediction
);

  const [
    prediction,
    setPrediction,
  ] = useState<
    Prediction | null
  >(null);

const [
  benchmarkData,
  setBenchmarkData,
] = useState<DashboardAnalytics | null>(null);

  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);



  /* =========================================
     LOAD PROJECT DETAILS
  ========================================= */

  useEffect(() => {

    loadProjectDetails();

  }, [project.projectId]);



  const loadProjectDetails =
    async () => {

      try {

        setLoading(true);

        setError(null);


        const [
          allSnapshots,
          predictions,
        ] =
          await Promise.all([

            getAllProjectSnapshots(),

            getPredictionsByProjectId(
              project.projectId
            ),

          ]);


setMlPredictionLoading(true);
setMlPredictionError(null);

try {
  const mlResult = await getMLProjectPrediction(
    project.projectId
  );

  setMlPrediction(mlResult);
} catch (mlError) {
  console.error(
    "ML prediction unavailable:",
    mlError
  );

  setMlPrediction(null);

  setMlPredictionError(
    mlError instanceof Error
      ? mlError.message
      : "ML prediction unavailable."
  );
} finally {
  setMlPredictionLoading(false);
}

try {
  setBenchmarkLoading(true);
  setBenchmarkError(null);

  const benchmarkData =
    await getBenchmarkProjects(project);

  setBenchmarkProjects(benchmarkData);
} catch (error) {
  console.error(
    "Benchmark loading failed:",
    error
  );

  setBenchmarkError(
    error instanceof Error
      ? error.message
      : "Unable to load benchmark projects."
  );
} finally {
  setBenchmarkLoading(false);
}

        const projectSnapshots =
          allSnapshots.filter(
            (snapshot) =>
              snapshot.projectId ===
              project.projectId
          );
const analyticsData =
  await getDashboardAnalytics();

setBenchmarkData(
  analyticsData
);

        const latest =
          getLatestSnapshot(
            projectSnapshots
          );


        setLatestSnapshot(
          latest
        );


        if (
          predictions &&
          predictions.length > 0
        ) {

          setPrediction(
            predictions[0]
          );

        } else {

          setPrediction(
            null
          );

        }


      } catch (err) {

        console.error(
          "Failed to load project details:",
          err
        );


        setError(
          "Failed to load project details."
        );

      } finally {

        setLoading(false);

      }

    };



  /* =========================================
     LOADING
  ========================================= */

  if (loading) {

    return (

      <div className="project-details-page">

        <div className="project-details-message">

          Loading project details...

        </div>

      </div>

    );

  }



  /* =========================================
     ERROR
  ========================================= */

  if (error) {

    return (

      <div className="project-details-page">

        <div className="project-details-message error">

          <p>
            {error}
          </p>


          <button
            type="button"
            onClick={loadProjectDetails}
          >

            Retry

          </button>


        </div>

      </div>

    );

  }



  return (

    <div className="project-details-page">


      {/* =====================================
          PAGE HEADER
      ====================================== */}

      <div className="project-details-header">


        <div>

          <button
            type="button"
            className="back-button"
            onClick={onBack}
          >

            ← Back to Projects

          </button>


          <h1>

            {project.projectName}

          </h1>


          <p>

            Project ID: {project.projectId}

          </p>


        </div>



       <div className="project-header-actions">

  {latestSnapshot?.projectStatus && (
    <div
      className={`
        project-status-badge
        status-${latestSnapshot.projectStatus.toLowerCase()}
      `}
    >
      {latestSnapshot.projectStatus}
    </div>
  )}

  {onAddSnapshot && (
    <button
      type="button"
      className="add-snapshot-button"
      onClick={onAddSnapshot}
    >
      + Add Snapshot
    </button>
  )}

  <button
    type="button"
    className="edit-project-button"
    onClick={onEdit}
  >
    Edit Project
  </button>

</div>

      </div>



      {/* =====================================
          BASIC INFORMATION
      ====================================== */}

      <section className="details-card">


        <h2>
          Basic Information
        </h2>


        <div className="details-grid">


          <div className="detail-item">

            <span>
              Project ID
            </span>

            <strong>
              {project.projectId}
            </strong>

          </div>



          <div className="detail-item">

            <span>
              Project Name
            </span>

            <strong>
              {project.projectName}
            </strong>

          </div>



          <div className="detail-item">

            <span>
              Ministry
            </span>

            <strong>
              {project.ministry}
            </strong>

          </div>



          <div className="detail-item">

            <span>
              Data Source
            </span>

            <strong>
              {project.dataSource}
            </strong>

          </div>



          <div className="detail-item full-width">

            <span>
              Source Project Code
            </span>

            <strong>

              {project.sourceProjectCode ??
                "Not available"}

            </strong>

          </div>


        </div>


      </section>



      {/* =====================================
          CLASSIFICATION
      ====================================== */}

      <section className="details-card">


        <h2>
          Classification
        </h2>


        <div className="details-grid">


          <div className="detail-item">

            <span>
              Domain
            </span>

            <strong>
              {project.domain}
            </strong>

          </div>



          <div className="detail-item">

            <span>
              Project Type
            </span>

            <strong>

              {project.projectType ??
                "Not available"}

            </strong>

          </div>


        </div>


      </section>



      {/* =====================================
          IMPLEMENTING ORGANIZATION
      ====================================== */}

      <section className="details-card">


        <h2>
          Organization
        </h2>


        <div className="details-grid">


          <div className="detail-item full-width">

            <span>
              Implementing Agency
            </span>

            <strong>

              {project.implementingAgency ??
                "Not available"}

            </strong>

          </div>


        </div>


      </section>



      {/* =====================================
          LOCATION
      ====================================== */}

      <section className="details-card">


        <h2>
          Location
        </h2>


        <div className="details-grid">


          <div className="detail-item">

            <span>
              State
            </span>

            <strong>

              {project.state ??
                "Not available"}

            </strong>

          </div>



          <div className="detail-item">

            <span>
              District / Location
            </span>

            <strong>

              {project.districtOrLocation ??
                "Not available"}

            </strong>

          </div>


        </div>


      </section>



      {/* =====================================
          ORIGINAL PROJECT INFORMATION
      ====================================== */}

      <section className="details-card">


        <h2>
          Original Project Information
        </h2>


        <div className="details-grid">


          <div className="detail-item">

            <span>
              Approval Date
            </span>

            <strong>

              {formatDate(
                project.approvalDate
              )}

            </strong>

          </div>



          <div className="detail-item">

            <span>
              Original Project Cost
            </span>

            <strong>

              {formatCrore(
                project.originalCostCr
              )}

            </strong>

          </div>



          <div className="detail-item full-width">

            <span>
              Original Completion Date
            </span>

            <strong>

              {formatDate(
                project.originalCompletionDate
              )}

            </strong>

          </div>


        </div>


      </section>



      {/* =====================================
          LATEST SNAPSHOT
      ====================================== */}

      <section className="details-card">


        <h2>
          Latest Project Snapshot
        </h2>


        {latestSnapshot ? (

          <div className="details-grid">


            <div className="detail-item">

              <span>
                Report Type
              </span>

              <strong>
                {latestSnapshot.reportType}
              </strong>

            </div>



            <div className="detail-item">

              <span>
                Report Period
              </span>

              <strong>
                {latestSnapshot.reportPeriod}
              </strong>

            </div>



            <div className="detail-item">

              <span>
                Report Date
              </span>

              <strong>

                {formatDate(
                  latestSnapshot.reportDate
                )}

              </strong>

            </div>



            <div className="detail-item">

              <span>
                Current Status
              </span>

              <strong>

                {latestSnapshot.projectStatus ??
                  "No Data"}

              </strong>

            </div>



            <div className="detail-item">

              <span>
                Revised Cost
              </span>

              <strong>

                {formatCrore(
                  latestSnapshot.revisedCostCr
                )}

              </strong>

            </div>



            <div className="detail-item">

              <span>
                Anticipated Cost
              </span>

              <strong>

                {formatCrore(
                  latestSnapshot.anticipatedCostCr
                )}

              </strong>

            </div>



            <div className="detail-item">

              <span>
                Cumulative Expenditure
              </span>

              <strong>

                {formatCrore(
                  latestSnapshot.cumulativeExpenditureCr
                )}

              </strong>

            </div>



            <div className="detail-item">

              <span>
                Physical Progress
              </span>

              <strong>

                {latestSnapshot.physicalProgressPct ??
                  0}

                %

              </strong>

            </div>



            <div className="detail-item">

              <span>
                Revised Completion Date
              </span>

              <strong>

                {formatDate(
                  latestSnapshot.revisedCompletionDate
                )}

              </strong>

            </div>



            <div className="detail-item">

              <span>
                Anticipated Completion Date
              </span>

              <strong>

                {formatDate(
                  latestSnapshot.anticipatedCompletionDate
                )}

              </strong>

            </div>



            <div className="detail-item full-width">

              <span>
                Remarks
              </span>

              <p>

                {latestSnapshot.remarks ??
                  "No remarks available."}

              </p>

            </div>


          </div>

        ) : (

          <div className="no-data-message">

            No project snapshot available.

          </div>

        )}


      </section>



      {/* =====================================
          PHYSICAL PROGRESS
      ====================================== */}

      <section className="details-card">


        <h2>
          Physical Progress
        </h2>


        <div className="progress-section">


          <div className="progress-info">

            <span>
              Latest Reported Progress
            </span>


            <strong>

              {latestSnapshot?.physicalProgressPct ??
                0}

              %

            </strong>


          </div>



          <div className="progress-bar">

            <div

              className="progress-fill"

              style={{

                width: `${Math.min(

                  Math.max(

                    latestSnapshot
                      ?.physicalProgressPct ??
                    0,

                    0

                  ),

                  100

                )}%`,

              }}

            />

          </div>


        </div>


      </section>



  {/* =====================================
    AI PREDICTION
====================================== */}

<section className="details-card">

  <h2>
    AI Risk Prediction
  </h2>

  {mlPredictionLoading ? (

    <div className="no-data-message">
      Generating AI prediction...
    </div>

  ) : mlPredictionError ? (

    <div className="no-data-message">

      <p>
        AI prediction unavailable.
      </p>

      <small>
        {mlPredictionError}
      </small>

    </div>

  ) : mlPrediction ? (

    <div className="details-grid">

      <div className="detail-item">

        <span>
          Predicted Delay
        </span>

        <strong>
     {typeof mlPrediction.prediction.predicted_delay_months === "number"
  ? mlPrediction.prediction.predicted_delay_months.toFixed(1)
  : "—"}
          {" "}
          months
        </strong>

      </div>


      <div className="detail-item">

        <span>
          Predicted Cost Overrun
        </span>

        <strong>
       {typeof mlPrediction.prediction.predicted_cost_overrun_pct === "number"
  ? mlPrediction.prediction.predicted_cost_overrun_pct.toFixed(2)
  : "—"}
          %
        </strong>

      </div>


      <div className="detail-item">

        <span>
          Predicted Cost Overrun
        </span>

        <strong>
          ₹{" "}
         {typeof mlPrediction.prediction.predicted_cost_overrun_cr === "number"
  ? mlPrediction.prediction.predicted_cost_overrun_cr.toFixed(2)
  : "—"}
          {" "}
          Cr
        </strong>

      </div>


      <div className="detail-item">

        <span>
          Risk Score
        </span>

        <strong>
       {typeof mlPrediction.prediction.predicted_risk_score === "number"
  ? mlPrediction.prediction.predicted_risk_score.toFixed(1)
  : "—"}
          {" "}
          / 100
        </strong>

      </div>


      <div className="detail-item">

        <span>
          Risk Category
        </span>

        <strong>
          {mlPrediction.prediction.risk_category}
        </strong>

      </div>


      <div className="detail-item">

        <span>
          Model Version
        </span>

        <strong>
          {mlPrediction.prediction.model_version}
        </strong>

      </div>


      <div className="detail-item">

        <span>
          Features Used
        </span>

        <strong>
          {mlPrediction.prediction.feature_count}
        </strong>

      </div>


      <div className="detail-item">

        <span>
          Prediction Report
        </span>

        <strong>
          {mlPrediction.snapshot.reportPeriod}
        </strong>

      </div>

    </div>

  ) : (

    <div className="no-data-message">
      No AI prediction available for this project.
    </div>

  )}

</section>



{/* =====================================
   WHY THIS PROJECT IS AT RISK
===================================== */}

<section className="details-card risk-explanation-section">

  <div className="risk-explanation-header">

    <div>
      <h2>
        Why This Project Is At Risk
      </h2>

      <p>
        Key project factors contributing to
        the current risk assessment.
      </p>
    </div>

    <div className="explanation-badge">
      AI Explainability
    </div>

  </div>

  {riskExplanations.length === 0 ? (

    <div className="no-explanation-message">

      <span className="explanation-check">
        ✓
      </span>

      <div>
        <strong>
          Insufficient risk indicators
        </strong>

        <p>
          More project data is required to
          generate an explanation.
        </p>
      </div>

    </div>

  ) : (

    <div className="risk-explanation-list">

      {riskExplanations.map(
        (item, index) => (

          <div
            key={`${item.factor}-${index}`}
            className={`risk-explanation-item ${item.severity}`}
          >

            <div className="risk-factor-indicator">
              {item.severity === "high"
                ? "!"
                : item.severity === "medium"
                ? "•"
                : "✓"}
            </div>

            <div className="risk-explanation-content">

              <div className="risk-explanation-title-row">

                <strong>
                  {item.factor}
                </strong>

                <span className="risk-factor-value">
                  {item.value}
                </span>

              </div>

              <p>
                {item.explanation}
              </p>

            </div>

            <span
              className={`risk-factor-severity ${item.severity}`}
            >
              {item.severity}
            </span>

          </div>

        )
      )}

    </div>

  )}

</section>


{/* =====================================
   COST ESCALATION ANALYSIS
===================================== */}

<section className="details-card cost-analysis-section">

  <div className="cost-analysis-header">

    <div>
      <h2>
        Cost Escalation Analysis
      </h2>

      <p>
        Comparison of approved and revised
        project cost.
      </p>
    </div>

    <div className="cost-analysis-badge">
      Financial Analysis
    </div>

  </div>

  {originalCost !== null ? (

    <div className="cost-analysis-grid">

      <div className="cost-analysis-item">

        <span>
          Original Approved Cost
        </span>

        <strong>
          ₹{originalCost.toFixed(2)} Cr
        </strong>

      </div>


      <div className="cost-analysis-item">

        <span>
          Revised Cost
        </span>

        <strong>
          {revisedCost !== null
            ? `₹${revisedCost.toFixed(2)} Cr`
            : "Not available"}
        </strong>

      </div>


      <div className="cost-analysis-item">

        <span>
          Cost Increase
        </span>

        <strong
          className={
            costIncreasePct !== null &&
            costIncreasePct > 0
              ? "cost-increase-value"
              : "cost-normal-value"
          }
        >
          {costIncreasePct !== null
            ? `${costIncreasePct.toFixed(2)}%`
            : "Not available"}
        </strong>

      </div>

    </div>

  ) : (

    <div className="no-cost-data">
      Cost escalation cannot be calculated from
      the available project data.
    </div>

  )}

</section>

<section className="details-card early-warning-section">

  <div className="early-warning-header">

    <div>
      <h2>
        Early Warning Signals
      </h2>

      <p>
        Potential project risks identified from
        current project indicators and AI predictions.
      </p>
    </div>

    <div className="warning-count">
      {earlyWarnings.length}{" "}
      {earlyWarnings.length === 1
        ? "Alert"
        : "Alerts"}
    </div>

  </div>


  {earlyWarnings.length === 0 ? (

    <div className="no-warning-message">

      <span className="warning-check">
        ✓
      </span>

      <div>
        <strong>
          No active warning signals
        </strong>

        <p>
          No significant risk indicators were
          detected from the available project data.
        </p>
      </div>

    </div>

  ) : (

    <div className="warning-list">

      {earlyWarnings.map(
        (warning, index) => (

          <div
            key={`${warning.title}-${index}`}
            className={`warning-item ${warning.severity}`}
          >

            <div className="warning-icon">
              {warning.severity === "high"
                ? "!"
                : "!"}
            </div>

            <div className="warning-content">

              <div className="warning-title-row">

                <strong>
                  {warning.title}
                </strong>

                <span
                  className={`warning-severity ${warning.severity}`}
                >
                  {warning.severity === "high"
                    ? "High"
                    : "Medium"}
                </span>

              </div>

              <p>
                {warning.message}
              </p>

            </div>

          </div>

        )
      )}

    </div>

  )}

</section>


{/* =====================================
    AI EXPLANATION
====================================== */}

<section className="details-card explanation-section">

  <div className="explanation-header">

    <div>
      <h2>
        Why did AI give this prediction?
      </h2>

      <p>
        Key project factors contributing to the
        current AI prediction.
      </p>
    </div>

    {mlPrediction && (
      <div className="explanation-score">
        Risk Score{" "}
        <strong>
          {typeof mlPrediction.prediction.predicted_risk_score ===
          "number"
            ? mlPrediction.prediction.predicted_risk_score.toFixed(1)
            : "—"}
        </strong>
        /100
      </div>
    )}

  </div>

  {mlPredictionLoading ? (

    <div className="prediction-loading">
      Analysing project factors...
    </div>

  ) : explanationFactors.length === 0 ? (

    <div className="no-explanation-message">

      <span className="explanation-info-icon">
        i
      </span>

      <div>
        <strong>
          Explanation unavailable
        </strong>

        <p>
          Additional project data is required to
          explain the current prediction.
        </p>
      </div>

    </div>

  ) : (

    <div className="explanation-list">

      {explanationFactors.map(
        (factor, index) => (

          <div
            key={`${factor.title}-${index}`}
            className={`explanation-item ${factor.impact}`}
          >

            <div className="explanation-factor-icon">
              {factor.impact === "high"
                ? "!"
                : factor.impact === "medium"
                ? "•"
                : "✓"}
            </div>

            <div className="explanation-factor-content">

              <div className="explanation-factor-top">

                <strong>
                  {factor.title}
                </strong>

                <div className="explanation-factor-meta">

                  <span className="explanation-value">
                    {factor.value}
                  </span>

                  <span
                    className={`explanation-impact ${factor.impact}`}
                  >
                    {factor.impact === "high"
                      ? "High Impact"
                      : factor.impact === "medium"
                      ? "Medium Impact"
                      : "Low Impact"}
                  </span>

                </div>

              </div>

              <p>
                {factor.explanation}
              </p>

            </div>

          </div>

        )
      )}

    </div>

  )}

</section>

{/* =====================================
    BENCHMARKING
====================================== */}

<section className="details-card benchmarking-section">

  <div className="benchmarking-header">

    <div>
      <h2>
        Benchmarking & Similar Projects
      </h2>

      <p>
        Comparison with other real projects from
        the same domain available in the system.
      </p>
    </div>

    <div className="benchmark-count">
      {benchmarkProjects.length}{" "}
      {benchmarkProjects.length === 1
        ? "Project"
        : "Projects"}
    </div>

  </div>

  {benchmarkLoading ? (

    <div className="benchmark-message">
      Loading similar projects...
    </div>

  ) : benchmarkError ? (

    <div className="benchmark-message error">

      <strong>
        Benchmarking unavailable
      </strong>

      <p>
        {benchmarkError}
      </p>

    </div>

  ) : benchmarkProjects.length === 0 ? (

    <div className="benchmark-message">

      <span className="benchmark-info-icon">
        i
      </span>

      <div>
        <strong>
          No comparable projects available
        </strong>

        <p>
          No other project with a matching domain
          and available snapshot data was found.
        </p>
      </div>

    </div>

  ) : (

    <div className="benchmark-list">

      {benchmarkProjects.map(
        (benchmark) => {

          const originalCost =
            benchmark.snapshot.originalCostCr ??
            benchmark.project.originalCostCr ??
            null;

          const revisedCost =
            benchmark.snapshot.revisedCostCr ??
            null;

          return (
            <div
              key={
                benchmark.project.projectId
              }
              className="benchmark-card"
            >

              <div className="benchmark-card-header">

                <div className="benchmark-project-info">

                  <span className="benchmark-project-id">
                    Project ID:{" "}
                    {benchmark.project.projectId}
                  </span>

                  <h3>
                    {benchmark.project.projectName}
                  </h3>

                  <span className="benchmark-agency">
                    {benchmark.project.implementingAgency ??
                      "Agency not available"}
                  </span>

                </div>

                <span className="benchmark-domain">
                  {benchmark.project.domain}
                </span>

              </div>

              <div className="benchmark-metrics">

                <div className="benchmark-metric">

                  <span>
                    Original Cost
                  </span>

                  <strong>
                    {originalCost !== null
                      ? `₹ ${originalCost.toFixed(2)} Cr`
                      : "No Data"}
                  </strong>

                </div>

                <div className="benchmark-metric">

                  <span>
                    Revised Cost
                  </span>

                  <strong>
                    {revisedCost !== null
                      ? `₹ ${revisedCost.toFixed(2)} Cr`
                      : "No Data"}
                  </strong>

                </div>

                <div className="benchmark-metric">

                  <span>
                    Physical Progress
                  </span>

                  <strong>
                    {typeof benchmark.snapshot
                      .physicalProgressPct === "number"
                      ? `${benchmark.snapshot.physicalProgressPct.toFixed(1)}%`
                      : "No Data"}
                  </strong>

                </div>

                <div className="benchmark-metric">

                  <span>
                    Financial Progress
                  </span>

                  <strong>
                    {benchmark.financialProgressPct !== null
                      ? `${benchmark.financialProgressPct.toFixed(1)}%`
                      : "No Data"}
                  </strong>

                </div>

                <div className="benchmark-metric">

                  <span>
                    Cost Variance
                  </span>

                  <strong
                    className={
                      benchmark.costVariancePct !== null &&
                      benchmark.costVariancePct > 0
                        ? "benchmark-negative"
                        : "benchmark-positive"
                    }
                  >
                    {benchmark.costVariancePct !== null
                      ? `${benchmark.costVariancePct >= 0 ? "+" : ""}${benchmark.costVariancePct.toFixed(1)}%`
                      : "No Data"}
                  </strong>

                </div>

                <div className="benchmark-metric">

                  <span>
                    Schedule Status
                  </span>

                  <strong
                    className={
                      benchmark.scheduleStatus ===
                      "Within Target"
                        ? "benchmark-positive"
                        : benchmark.scheduleStatus ===
                          "Delayed / Past Target"
                        ? "benchmark-negative"
                        : ""
                    }
                  >
                    {benchmark.scheduleStatus}
                  </strong>

                </div>

              </div>

            </div>
          );
        }
      )}

    </div>

  )}

</section>


{/* =====================================
    COST ESCALATION ANALYSIS
====================================== */}

<section className="details-card cost-analysis-section">

  <div className="cost-analysis-header">

    <div>
      <h2>
        Cost Escalation Driver Analysis
      </h2>

      <p>
        Project factors associated with cost and
        execution pressure based on available data.
      </p>
    </div>

    {latestSnapshot?.originalCostCr !== null &&
      latestSnapshot?.originalCostCr !== undefined &&
      latestSnapshot?.revisedCostCr !== null &&
      latestSnapshot?.revisedCostCr !== undefined &&
      latestSnapshot.originalCostCr > 0 && (
        <div className="cost-escalation-badge">

          {(
            ((latestSnapshot.revisedCostCr -
              latestSnapshot.originalCostCr) /
              latestSnapshot.originalCostCr) *
            100
          ).toFixed(1)}
          % Escalation

        </div>
      )}

  </div>

  {costDrivers.length === 0 ? (

    <div className="cost-analysis-empty">

      <span className="cost-analysis-info">
        i
      </span>

      <div>
        <strong>
          Cost driver analysis unavailable
        </strong>

        <p>
          Additional cost or execution data is
          required for this analysis.
        </p>
      </div>

    </div>

  ) : (

    <div className="cost-driver-list">

      {costDrivers.map(
        (driver, index) => (

          <div
            key={`${driver.title}-${index}`}
            className={`cost-driver-item ${driver.impact}`}
          >

            <div className="cost-driver-icon">

              {driver.impact === "high"
                ? "!"
                : driver.impact === "medium"
                ? "•"
                : "✓"}

            </div>

            <div className="cost-driver-content">

              <div className="cost-driver-top">

                <strong>
                  {driver.title}
                </strong>

                <div className="cost-driver-meta">

                  <span className="cost-driver-value">
                    {driver.value}
                  </span>

                  <span
                    className={`cost-driver-impact ${driver.impact}`}
                  >
                    {driver.impact === "high"
                      ? "High"
                      : driver.impact === "medium"
                      ? "Medium"
                      : "Low"}
                  </span>

                </div>

              </div>

              <p>
                {driver.description}
              </p>

            </div>

          </div>

        )
      )}

    </div>

  )}

</section>

{/* =====================================
    ACTIONABLE RECOMMENDATIONS
====================================== */}

<section className="details-card recommendations-section">

  <div className="recommendations-header">

    <div>
      <h2>
        Recommended Actions
      </h2>

      <p>
        Suggested actions based on detected project
        risks, execution factors and AI predictions.
      </p>
    </div>

    <div className="recommendation-count">
      {recommendations.length}{" "}
      {recommendations.length === 1
        ? "Action"
        : "Actions"}
    </div>

  </div>

  {recommendations.length === 0 ? (

    <div className="recommendations-empty">

      <span className="recommendation-check">
        ✓
      </span>

      <div>
        <strong>
          No immediate actions identified
        </strong>

        <p>
          No significant actionable risk indicators
          were detected from the available data.
        </p>
      </div>

    </div>

  ) : (

    <div className="recommendation-list">

      {recommendations.map(
        (recommendation, index) => (

          <div
            key={`${recommendation.title}-${index}`}
            className={`recommendation-item ${recommendation.priority}`}
          >

            <div className="recommendation-number">
              {index + 1}
            </div>

            <div className="recommendation-content">

              <div className="recommendation-title-row">

                <strong>
                  {recommendation.title}
                </strong>

                <span
                  className={`recommendation-priority ${recommendation.priority}`}
                >
                  {recommendation.priority === "high"
                    ? "High Priority"
                    : recommendation.priority === "medium"
                    ? "Medium Priority"
                    : "Low Priority"}
                </span>

              </div>

              <p>
                {recommendation.reason}
              </p>

            </div>

          </div>

        )
      )}

    </div>

  )}

</section>

    </div>

  );

}


export default ProjectDetails;