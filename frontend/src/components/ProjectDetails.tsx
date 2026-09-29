import  { useEffect, useState, useMemo } from "react";
import React from "react";

import type {
  Project,
  ProjectSnapshot,
} from "../../../shared/types";

import {
  getBenchmarkProjects,
  type BenchmarkProject,
} from "../services/benchmarkService";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import {
  askProjectIntelligence,
  type ProjectIntelligenceResponse,
} from "../services/projectIntelligenceService";

import {
  getAllProjectSnapshots,
} from "../services/projectSnapshotService";

import {
  getMLProjectPrediction,
  getNextMonthProgressPrediction,
} from "../services/predictionService";

import type {
  MLProjectPredictionResponse,
  TemporalProgressPredictionResponse,
} from "../services/predictionService";

import "./ProjectDetails.css";

interface ProjectDetailsProps {
  project: Project;
  onBack: () => void;
  onEdit: () => void;
  onAddSnapshot?: () => void;
  onDelete?: () => Promise<void> | void;
}

/* =========================================
   DATE CONVERSION
========================================= */

const formatDate = (value: unknown): string => {
  if (!value) {
    return "Not available";
  }

  if (value instanceof Date) {
    return value.toLocaleDateString("en-IN");
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date })
      .toDate()
      .toLocaleDateString("en-IN");
  }

  if (typeof value === "string") {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("en-IN");
    }

    return value;
  }

  return "Not available";
};

/* =========================================
   TIMESTAMP COMPARISON
========================================= */

const getTimestampMilliseconds = (value: unknown): number => {
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
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().getTime();
  }

  if (typeof value === "string") {
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
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

  return snapshots.reduce((latest, current) => {
    const latestTime = getTimestampMilliseconds(latest.reportDate);
    const currentTime = getTimestampMilliseconds(current.reportDate);

    return currentTime > latestTime ? current : latest;
  });
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

  const originalCost = snapshot.originalCostCr ?? null;
  const revisedCost = snapshot.revisedCostCr ?? null;

  if (originalCost !== null && revisedCost !== null && originalCost > 0) {
    const costIncrease =
      ((revisedCost - originalCost) / originalCost) * 100;

    if (costIncrease >= 10) {
      warnings.push({
        title: "Cost Escalation Risk",
        message: `Project cost has increased by ${costIncrease.toFixed(1)}% compared with the original approved cost.`,
        severity: "high",
      });
    } else if (costIncrease >= 5) {
      warnings.push({
        title: "Cost Escalation Watch",
        message: `Project cost has increased by ${costIncrease.toFixed(1)}% compared with the original approved cost.`,
        severity: "medium",
      });
    }
  }

  const physicalProgress = snapshot.physicalProgressPct;

  if (typeof physicalProgress === "number" && physicalProgress < 50) {
    warnings.push({
      title: "Execution Progress Risk",
      message: `Physical progress is currently ${physicalProgress.toFixed(1)}%. Project execution should be monitored closely.`,
      severity: physicalProgress < 25 ? "high" : "medium",
    });
  }

  const totalMilestones = snapshot.totalMilestones;
  const delayedMilestones = snapshot.delayedMilestones;

  if (
    typeof totalMilestones === "number" &&
    totalMilestones > 0 &&
    typeof delayedMilestones === "number"
  ) {
    const delayedRatio = (delayedMilestones / totalMilestones) * 100;

    if (delayedRatio >= 30) {
      warnings.push({
        title: "Milestone Delay Risk",
        message: `${delayedMilestones} of ${totalMilestones} milestones are delayed (${delayedRatio.toFixed(1)}%).`,
        severity: delayedRatio >= 50 ? "high" : "medium",
      });
    }
  }

  const landDelay = snapshot.landAcquisitionDelayMonths;

  if (typeof landDelay === "number" && landDelay > 0) {
    warnings.push({
      title: "Land Acquisition Delay",
      message: `Land acquisition is contributing approximately ${landDelay.toFixed(1)} months of delay.`,
      severity: landDelay >= 6 ? "high" : "medium",
    });
  }

  const clearanceDelay = snapshot.clearanceDelayMonths;

  if (typeof clearanceDelay === "number" && clearanceDelay > 0) {
    warnings.push({
      title: "Clearance Delay",
      message: `Clearance-related delays account for approximately ${clearanceDelay.toFixed(1)} months.`,
      severity: clearanceDelay >= 6 ? "high" : "medium",
    });
  }

  const contractorDelay = snapshot.contractorDelayScore;

  if (typeof contractorDelay === "number" && contractorDelay >= 1.5) {
    warnings.push({
      title: "Contractor Execution Risk",
      message: `A contractor delay score of ${contractorDelay.toFixed(1)} indicates execution friction that may affect project delivery.`,
      severity: contractorDelay >= 3 ? "high" : "medium",
    });
  }

  const geologicalDelay = snapshot.geologicalDelayScore;

  if (typeof geologicalDelay === "number" && geologicalDelay >= 1.5) {
    warnings.push({
      title: "Geological / Site Condition Risk",
      message: `A geological delay score of ${geologicalDelay.toFixed(1)} indicates site-condition related execution pressure.`,
      severity: geologicalDelay >= 3 ? "high" : "medium",
    });
  }

  if (mlResult) {
    const predictedDelay = mlResult.prediction.predicted_delay_months;

    if (typeof predictedDelay === "number" && predictedDelay >= 6) {
      warnings.push({
        title: "AI Predicted Schedule Risk",
        message: `The ML model predicts approximately ${predictedDelay.toFixed(1)} months of potential delay.`,
        severity: predictedDelay >= 12 ? "high" : "medium",
      });
    }

    const riskScore = mlResult.prediction.predicted_risk_score;

    if (typeof riskScore === "number" && riskScore > 50) {
      warnings.push({
        title: "AI Risk Alert",
        message: `The AI risk score is ${riskScore.toFixed(1)} / 100.`,
        severity: riskScore > 75 ? "high" : "medium",
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

  const originalCost = snapshot.originalCostCr ?? null;
  const revisedCost = snapshot.revisedCostCr ?? null;

  if (originalCost !== null && revisedCost !== null && originalCost > 0) {
    const costIncrease = ((revisedCost - originalCost) / originalCost) * 100;

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

  const totalMilestones = snapshot.totalMilestones;
  const delayedMilestones = snapshot.delayedMilestones;

  if (
    typeof totalMilestones === "number" &&
    totalMilestones > 0 &&
    typeof delayedMilestones === "number"
  ) {
    const delayedRatio = (delayedMilestones / totalMilestones) * 100;

    factors.push({
      title: "Delayed Milestones",
      value: `${delayedMilestones}/${totalMilestones}`,
      impact:
        delayedRatio >= 50
          ? "high"
          : delayedRatio >= 30
          ? "medium"
          : "low",
      explanation: `${delayedRatio.toFixed(1)}% of recorded milestones are delayed, which can contribute to schedule risk.`,
    });
  }

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

  const predictedDelay = mlResult.prediction.predicted_delay_months;

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

  const originalCost = snapshot.originalCostCr ?? null;
  const revisedCost = snapshot.revisedCostCr ?? null;

  if (originalCost !== null && revisedCost !== null && originalCost > 0) {
    const escalationPct = ((revisedCost - originalCost) / originalCost) * 100;

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

  const landDelay = snapshot.landAcquisitionDelayMonths;

  if (typeof landDelay === "number" && landDelay > 0) {
    drivers.push({
      title: "Land Acquisition Delay",
      value: `${landDelay.toFixed(1)} months`,
      impact: landDelay >= 6 ? "high" : "medium",
      description:
        "Recorded land acquisition delay represents an execution factor that may contribute to additional project time and associated costs.",
    });
  }

  const clearanceDelay = snapshot.clearanceDelayMonths;

  if (typeof clearanceDelay === "number" && clearanceDelay > 0) {
    drivers.push({
      title: "Clearance Delay",
      value: `${clearanceDelay.toFixed(1)} months`,
      impact: clearanceDelay >= 6 ? "high" : "medium",
      description:
        "Recorded clearance-related delay represents a potential implementation bottleneck.",
    });
  }

  const contractorDelay = snapshot.contractorDelayScore;

  if (typeof contractorDelay === "number" && contractorDelay > 0) {
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

  const geologicalDelay = snapshot.geologicalDelayScore;

  if (typeof geologicalDelay === "number" && geologicalDelay > 0) {
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

  const totalMilestones = snapshot.totalMilestones;
  const delayedMilestones = snapshot.delayedMilestones;

  if (
    typeof totalMilestones === "number" &&
    totalMilestones > 0 &&
    typeof delayedMilestones === "number"
  ) {
    const delayedRatio = (delayedMilestones / totalMilestones) * 100;

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

  const originalCost = snapshot.originalCostCr ?? null;
  const revisedCost = snapshot.revisedCostCr ?? null;

  if (originalCost !== null && revisedCost !== null && originalCost > 0) {
    const costIncrease = ((revisedCost - originalCost) / originalCost) * 100;

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

  const physicalProgress = snapshot.physicalProgressPct;

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

  const totalMilestones = snapshot.totalMilestones;
  const delayedMilestones = snapshot.delayedMilestones;

  if (
    typeof totalMilestones === "number" &&
    totalMilestones > 0 &&
    typeof delayedMilestones === "number"
  ) {
    const delayedRatio = (delayedMilestones / totalMilestones) * 100;

    explanations.push({
      factor: "Milestone Delays",
      value: `${delayedMilestones}/${totalMilestones}`,
      explanation: `${delayedRatio.toFixed(1)}% of recorded milestones are delayed.`,
      severity:
        delayedRatio >= 50
          ? "high"
          : delayedRatio >= 30
          ? "medium"
          : "low",
    });
  }

  const landDelay = snapshot.landAcquisitionDelayMonths;

  if (typeof landDelay === "number" && landDelay > 0) {
    explanations.push({
      factor: "Land Acquisition",
      value: `${landDelay.toFixed(1)} months`,
      explanation:
        "Land acquisition delay is contributing to project execution pressure.",
      severity: landDelay >= 6 ? "high" : "medium",
    });
  }

  const clearanceDelay = snapshot.clearanceDelayMonths;

  if (typeof clearanceDelay === "number" && clearanceDelay > 0) {
    explanations.push({
      factor: "Statutory Clearances",
      value: `${clearanceDelay.toFixed(1)} months`,
      explanation:
        "Clearance-related delay may affect project execution timelines.",
      severity: clearanceDelay >= 6 ? "high" : "medium",
    });
  }

  const contractorDelay = snapshot.contractorDelayScore;

  if (typeof contractorDelay === "number" && contractorDelay > 0) {
    explanations.push({
      factor: "Contractor Execution",
      value: contractorDelay.toFixed(1),
      explanation:
        "The recorded contractor delay factor indicates execution friction that may affect project delivery.",
      severity:
        contractorDelay >= 3
          ? "high"
          : contractorDelay >= 1.5
          ? "medium"
          : "low",
    });
  }

  const geologicalDelay = snapshot.geologicalDelayScore;

  if (typeof geologicalDelay === "number" && geologicalDelay > 0) {
    explanations.push({
      factor: "Geological / Site Conditions",
      value: geologicalDelay.toFixed(1),
      explanation:
        "The recorded geological delay factor indicates site-condition related execution pressure.",
      severity:
        geologicalDelay >= 3
          ? "high"
          : geologicalDelay >= 1.5
          ? "medium"
          : "low",
    });
  }

  if (mlResult) {
    const predictedDelay = mlResult.prediction.predicted_delay_months;

    if (typeof predictedDelay === "number" && predictedDelay > 0) {
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

    const predictedCost = mlResult.prediction.predicted_cost_overrun_pct;

    if (typeof predictedCost === "number" && predictedCost > 0) {
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

  const landDelay = snapshot.landAcquisitionDelayMonths;

  if (typeof landDelay === "number" && landDelay > 0) {
    recommendations.push({
      title: "Review land acquisition bottlenecks",
      reason: `Land acquisition delay of ${landDelay.toFixed(1)} months is recorded in the latest project data.`,
      priority: landDelay >= 6 ? "high" : "medium",
    });
  }

  const clearanceDelay = snapshot.clearanceDelayMonths;

  if (typeof clearanceDelay === "number" && clearanceDelay > 0) {
    recommendations.push({
      title: "Review clearance-related bottlenecks",
      reason: `Clearance-related delay of ${clearanceDelay.toFixed(1)} months is recorded.`,
      priority: clearanceDelay >= 6 ? "high" : "medium",
    });
  }

  const totalMilestones = snapshot.totalMilestones;
  const delayedMilestones = snapshot.delayedMilestones;

  if (
    typeof totalMilestones === "number" &&
    totalMilestones > 0 &&
    typeof delayedMilestones === "number"
  ) {
    const delayedRatio = (delayedMilestones / totalMilestones) * 100;

    if (delayedRatio >= 30) {
      recommendations.push({
        title: "Prioritise delayed milestones",
        reason: `${delayedMilestones} of ${totalMilestones} recorded milestones are delayed (${delayedRatio.toFixed(1)}%).`,
        priority: delayedRatio >= 50 ? "high" : "medium",
      });
    }
  }

  const contractorDelay = snapshot.contractorDelayScore;

  if (typeof contractorDelay === "number" && contractorDelay > 0) {
    recommendations.push({
      title: "Review contractor execution",
      reason: `A contractor delay score of ${contractorDelay.toFixed(1)} is recorded in the latest snapshot.`,
      priority: contractorDelay >= 3 ? "high" : "medium",
    });
  }

  const geologicalDelay = snapshot.geologicalDelayScore;

  if (typeof geologicalDelay === "number" && geologicalDelay > 0) {
    recommendations.push({
      title: "Review site-condition constraints",
      reason: `A geological delay score of ${geologicalDelay.toFixed(1)} is recorded.`,
      priority: geologicalDelay >= 3 ? "high" : "medium",
    });
  }

  if (mlResult) {
    const predictedDelay = mlResult.prediction.predicted_delay_months;

    if (typeof predictedDelay === "number" && predictedDelay >= 6) {
      recommendations.push({
        title: "Initiate schedule review",
        reason: `The ML model predicts approximately ${predictedDelay.toFixed(1)} months of potential delay.`,
        priority: predictedDelay >= 12 ? "high" : "medium",
      });
    }
  }

  const originalCost = snapshot.originalCostCr ?? null;
  const revisedCost = snapshot.revisedCostCr ?? null;

  if (originalCost !== null && revisedCost !== null && originalCost > 0) {
    const costIncrease = ((revisedCost - originalCost) / originalCost) * 100;

    if (costIncrease >= 5) {
      recommendations.push({
        title: "Review cost escalation",
        reason: `Project cost has increased by ${costIncrease.toFixed(1)}% compared with the original approved cost.`,
        priority: costIncrease >= 10 ? "high" : "medium",
      });
    }
  }

  const priorityOrder = {
    high: 1,
    medium: 2,
    low: 3,
  };

  recommendations.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  return recommendations;
};

/* =========================================
   CRORE FORMAT
========================================= */

const formatCrore = (value?: number | null): string => {
  if (value === undefined || value === null) {
    return "No Data";
  }

  return `₹ ${value.toLocaleString("en-IN")} Cr`;
};

const getTemporalForecastInterpretation = (
  currentProgress: number,
  predictedProgress: number,
  progressChange: number
): {
  title: string;
  message: string;
} => {
  if (currentProgress >= 99 && predictedProgress >= currentProgress) {
    return {
      title: "Project is approaching completion",
      message:
        "The project is already at a very high completion level. The forecast indicates limited additional progress next month, which is consistent with a project nearing completion.",
    };
  }

  if (progressChange < 0) {
    return {
      title: "Progress may decline",
      message:
        "The forecast indicates a negative change in physical progress. This should be reviewed against the latest project execution conditions and reported constraints.",
    };
  }

  if (progressChange < 0.25) {
    return {
      title: "Potential progress stagnation",
      message:
        "The forecast indicates only a small increase in physical progress next month. This may require closer monitoring of execution activities and outstanding work.",
    };
  }

  if (progressChange < 1) {
    return {
      title: "Limited progress expected",
      message:
        "The project is expected to make progress next month, but the increase is relatively limited. Monitoring execution velocity may help identify emerging delays.",
    };
  }

  return {
    title: "Positive progress expected",
    message:
      "The forecast indicates meaningful progress during the next month based on the latest project execution and financial indicators.",
  };
};

/* =========================================
   AI RISK INTERPRETATION
========================================= */

const getRiskInterpretation = (
  riskScore: number,
  riskCategory: string,
  predictedDelay: number,
  predictedCostOverrun: number
): {
  title: string;
  message: string;
} => {
  const category = riskCategory.toUpperCase();

  if (category === "CRITICAL" || riskScore > 75) {
    return {
      title: "High project risk requires attention",
      message: `The AI model assigns a ${riskScore.toFixed(
        1
      )}/100 risk score. The predicted schedule and cost indicators suggest that the project should receive close monitoring and timely intervention.`,
    };
  }

  if (category === "HIGH" || riskScore > 50) {
    return {
      title: "Project requires closer monitoring",
      message: `The AI model identifies elevated project risk with a ${riskScore.toFixed(
        1
      )}/100 score. Predicted delay and cost indicators should be reviewed alongside current project conditions.`,
    };
  }

  if (category === "MEDIUM" || riskScore > 25) {
    return {
      title: "Moderate project risk detected",
      message: `The AI model assigns a ${riskScore.toFixed(
        1
      )}/100 risk score. The project should continue to be monitored, particularly for changes in schedule or cost performance.`,
    };
  }

  if (predictedDelay > 0 || predictedCostOverrun > 0) {
    return {
      title: "Low modeled risk with measurable indicators",
      message: `The current AI risk score is ${riskScore.toFixed(
        1
      )}/100. Although the overall modeled risk is low, the prediction indicates approximately ${predictedDelay.toFixed(
        1
      )} months of potential delay and ${predictedCostOverrun.toFixed(
        2
      )}% potential cost overrun.`,
    };
  }

  return {
    title: "Low modeled risk",
    message:
      "The current project indicators result in a low modeled risk score. Continued monitoring is recommended as new project data becomes available.",
  };
};

/* =========================================
   COMPONENT
========================================= */

function ProjectDetails({
  project,
  onBack,
  onEdit,
  onAddSnapshot,
  onDelete,
}: ProjectDetailsProps) {
  const [latestSnapshot, setLatestSnapshot] = useState<ProjectSnapshot | null>(null);
  const [projectSnapshots, setProjectSnapshots] = useState<ProjectSnapshot[]>([]);

  const [mlPrediction, setMlPrediction] = useState<MLProjectPredictionResponse | null>(null);
  const [mlPredictionLoading, setMlPredictionLoading] = useState(false);
  const [mlPredictionError, setMlPredictionError] = useState<string | null>(null);

  const [intelligenceQuery, setIntelligenceQuery] = useState("");
const [intelligenceResponse, setIntelligenceResponse] =
  useState<ProjectIntelligenceResponse | null>(null);
const [intelligenceLoading, setIntelligenceLoading] = useState(false);
const [intelligenceError, setIntelligenceError] = useState<string | null>(null);
const [deleteConfirming, setDeleteConfirming] = useState(false);
const [deleting, setDeleting] = useState(false);
const [deleteError, setDeleteError] = useState<string | null>(null);

const handleDeleteProject = async () => {
  if (!onDelete || deleting) {
    return;
  }

  if (!deleteConfirming) {
    setDeleteConfirming(true);
    setDeleteError(null);
    return;
  }

  try {
    setDeleting(true);
    setDeleteError(null);
    await onDelete();
  } catch (err) {
    console.error("Failed to delete project:", err);
    setDeleteError("Failed to delete project.");
    setDeleting(false);
    setDeleteConfirming(false);
  }
};

const handleAskProjectIntelligence = async () => {
  const query = intelligenceQuery.trim();

  if (!query || intelligenceLoading) {
    return;
  }

  try {
    setIntelligenceLoading(true);
    setIntelligenceError(null);

    const result = await askProjectIntelligence(
      project.projectId,
      query
    );

    setIntelligenceResponse(result);
  } catch (error) {
    console.error(
      "Project intelligence request failed:",
      error
    );

    setIntelligenceResponse(null);

    setIntelligenceError(
      error instanceof Error
        ? error.message
        : "Unable to get project intelligence."
    );
  } finally {
    setIntelligenceLoading(false);
  }
};

  const [temporalPrediction, setTemporalPrediction] = useState<TemporalProgressPredictionResponse | null>(null);
  const [temporalPredictionLoading, setTemporalPredictionLoading] = useState(false);
  const [temporalPredictionError, setTemporalPredictionError] = useState<string | null>(null);

  const [benchmarkProjects, setBenchmarkProjects] = useState<BenchmarkProject[]>([]);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [benchmarkError, setBenchmarkError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProjectDetails() {
      try {
        if (!isMounted) return;
        setLoading(true);
        setError(null);

        const allSnapshots = await getAllProjectSnapshots();
        if (!isMounted) return;

        const filteredSnapshots = allSnapshots.filter(
          (snapshot) => snapshot.projectId === project.projectId
        );
        const latest = getLatestSnapshot(filteredSnapshots);

        setProjectSnapshots(filteredSnapshots);
        setLatestSnapshot(latest);
      } catch (err) {
        console.error("Failed to load project details:", err);
        if (isMounted) {
          setError("Failed to load project details.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProjectDetails();

    return () => {
      isMounted = false;
    };
  }, [project.projectId]);

  useEffect(() => {
    let isMounted = true;

    async function loadDeferredInsights() {
      setMlPredictionLoading(true);
      setMlPredictionError(null);
      setTemporalPredictionLoading(true);
      setTemporalPredictionError(null);
      setBenchmarkLoading(true);
      setBenchmarkError(null);

      const [mlResult, temporalResult, benchmarkResult] = await Promise.allSettled([
        getMLProjectPrediction(project.projectId),
        getNextMonthProgressPrediction(project.projectId),
        getBenchmarkProjects(project),
      ]);

      if (!isMounted) return;

      if (mlResult.status === "fulfilled") {
        setMlPrediction(mlResult.value);
      } else {
        console.error("ML prediction unavailable:", mlResult.reason);
        setMlPrediction(null);
        setMlPredictionError(
          mlResult.reason instanceof Error
            ? mlResult.reason.message
            : "ML prediction unavailable."
        );
      }
      setMlPredictionLoading(false);

      if (temporalResult.status === "fulfilled") {
        setTemporalPrediction(temporalResult.value);
      } else {
        console.error(
          "Temporal progress prediction unavailable:",
          temporalResult.reason
        );
        setTemporalPrediction(null);
        setTemporalPredictionError(
          temporalResult.reason instanceof Error
            ? temporalResult.reason.message
            : "Temporal progress prediction unavailable."
        );
      }
      setTemporalPredictionLoading(false);

      if (benchmarkResult.status === "fulfilled") {
        setBenchmarkProjects(benchmarkResult.value.slice(0, 4));
      } else {
        console.error("Benchmark loading failed:", benchmarkResult.reason);
        setBenchmarkError(
          benchmarkResult.reason instanceof Error
            ? benchmarkResult.reason.message
            : "Unable to load benchmark projects."
        );
      }
      setBenchmarkLoading(false);
    }

    loadDeferredInsights();

    return () => {
      isMounted = false;
    };
  }, [project.projectId]);

  /* =====================================
     MEMOIZED COMPUTED ARRAYS & STATS
  ===================================== */

  const benchmarkStats = useMemo(() => {
    if (benchmarkProjects.length === 0 || !latestSnapshot) {
      return null;
    }

    const progressValues = benchmarkProjects
      .map((item) => item.snapshot.physicalProgressPct)
      .filter((value): value is number => typeof value === "number");

    const costEscalationValues = benchmarkProjects
      .map((item) => {
        const originalCost =
          item.snapshot.originalCostCr ??
          item.project.originalCostCr ??
          null;
        const revisedCost = item.snapshot.revisedCostCr ?? null;

        if (
          originalCost === null ||
          revisedCost === null ||
          originalCost <= 0
        ) {
          return null;
        }

        return ((revisedCost - originalCost) / originalCost) * 100;
      })
      .filter((value): value is number => typeof value === "number");

    const averageProgress =
      progressValues.length > 0
        ? progressValues.reduce((sum, value) => sum + value, 0) /
          progressValues.length
        : null;

    const averageCostEscalation =
      costEscalationValues.length > 0
        ? costEscalationValues.reduce((sum, value) => sum + value, 0) /
          costEscalationValues.length
        : null;

    return {
      projectCount: benchmarkProjects.length,
      averageProgress,
      averageCostEscalation,
    };
  }, [benchmarkProjects, latestSnapshot]);

  const benchmarkComparison = useMemo(() => {
    if (!benchmarkStats || !latestSnapshot) {
      return null;
    }



    const currentProgress = latestSnapshot.physicalProgressPct;
    const currentOriginalCost = latestSnapshot.originalCostCr ?? null;
    const currentRevisedCost = latestSnapshot.revisedCostCr ?? null;

    const currentCostEscalation =
      currentOriginalCost !== null &&
      currentRevisedCost !== null &&
      currentOriginalCost > 0
        ? ((currentRevisedCost - currentOriginalCost) / currentOriginalCost) * 100
        : null;

    const progressDifference =
      currentProgress !== undefined &&
      currentProgress !== null &&
      benchmarkStats.averageProgress !== null
        ? currentProgress - benchmarkStats.averageProgress
        : null;

    const costDifference =
      currentCostEscalation !== null &&
      benchmarkStats.averageCostEscalation !== null
        ? currentCostEscalation - benchmarkStats.averageCostEscalation
        : null;

    return {
      currentProgress,
      currentCostEscalation,
      progressDifference,
      costDifference,
    };
  }, [benchmarkStats, latestSnapshot]);


  const benchmarkContext = useMemo(() => {
  if (!benchmarkComparison) {
    return null;
  }


  const progressDifference =
    benchmarkComparison.progressDifference;

  const costDifference =
    benchmarkComparison.costDifference;

  const progressContext =
    progressDifference === null
      ? "Physical progress comparison is unavailable."
      : progressDifference > 0
      ? `Current physical progress is ${progressDifference.toFixed(
          1
        )} percentage points above the peer average.`
      : progressDifference < 0
      ? `Current physical progress is ${Math.abs(
          progressDifference
        ).toFixed(
          1
        )} percentage points below the peer average.`
      : "Current physical progress is aligned with the peer average.";
const costContext =
  costDifference === null
    ? "Cost escalation comparison is unavailable."
    : Math.abs(costDifference) < 0.05
    ? "Current cost escalation is aligned with the peer average."
    : costDifference > 0
    ? `Current cost escalation is ${costDifference.toFixed(
        1
      )} percentage points above the peer average.`
    : `Current cost escalation is ${Math.abs(
        costDifference
      ).toFixed(
        1
      )} percentage points below the peer average.`;

  return {
    progressContext,
    costContext,
  };
}, [benchmarkComparison]);

  const earlyWarnings = useMemo(
    () => generateEarlyWarnings(latestSnapshot, mlPrediction),
    [latestSnapshot, mlPrediction]
  );

  const riskExplanations = useMemo(
    () => generateRiskExplanations(latestSnapshot, mlPrediction),
    [latestSnapshot, mlPrediction]
  );

  const originalCost =
    latestSnapshot?.originalCostCr ?? latestSnapshot?.revisedCostCr ?? null;
  const revisedCost = latestSnapshot?.revisedCostCr ?? null;

  const costIncreasePct =
    originalCost !== null && revisedCost !== null && originalCost > 0
      ? ((revisedCost - originalCost) / originalCost) * 100
      : null;

  const costDrivers = useMemo(
    () => generateCostDrivers(latestSnapshot),
    [latestSnapshot]
  );

  const recommendations = useMemo(
    () => generateRecommendations(latestSnapshot, mlPrediction),
    [latestSnapshot, mlPrediction]
  );


  const explanationFactors = useMemo(
  () =>
    generateExplanationFactors(
      latestSnapshot,
      mlPrediction
    ),
  [latestSnapshot, mlPrediction]
);

  const projectTimeline = useMemo(
    () => [
      {
        label: "Approval",
        date: formatDate(project.approvalDate),
        type: "completed",
      },
      {
        label: "Project Start",
        date: formatDate(project.startDate),
        type: "completed",
      },
      {
        label: "Original Completion",
        date: formatDate(project.originalCompletionDate),
        type: "planned",
      },
      {
        label: "Revised Completion",
        date: formatDate(latestSnapshot?.revisedCompletionDate),
        type: "revised",
      },
      {
        label: "Latest Snapshot",
        date: formatDate(latestSnapshot?.reportDate),
        type: "current",
      },
    ],
    [project, latestSnapshot]
  );

  const progressTrendData = useMemo(
    () =>
      projectSnapshots
        .filter((snapshot) => typeof snapshot.physicalProgressPct === "number")
        .sort(
          (a, b) =>
            getTimestampMilliseconds(a.reportDate) -
            getTimestampMilliseconds(b.reportDate)
        )
        .map((snapshot) => ({
          date: formatDate(snapshot.reportDate),
          progress: snapshot.physicalProgressPct ?? 0,
        })),
    [projectSnapshots]
  );

  const progressTrendContext = useMemo(() => {
  if (progressTrendData.length < 2) {
    return null;
  }


  

  const firstProgress =
    progressTrendData[0].progress;

  const latestProgress =
    progressTrendData[progressTrendData.length - 1].progress;

  const change =
    latestProgress - firstProgress;

  if (change > 0) {
    return `Physical progress increased by ${change.toFixed(
      1
    )} percentage points across the available snapshots.`;
  }

  if (change < 0) {
    return `Physical progress decreased by ${Math.abs(
      change
    ).toFixed(
      1
    )} percentage points across the available snapshots.`;
  }

  return "Physical progress remained unchanged across the available snapshots.";
}, [progressTrendData]);

  const costProgressTrendData = useMemo(
    () =>
      projectSnapshots
        .filter(
          (snapshot) =>
            typeof snapshot.physicalProgressPct === "number" &&
            typeof snapshot.cumulativeExpenditureCr === "number"
        )
        .sort(
          (a, b) =>
            getTimestampMilliseconds(a.reportDate) -
            getTimestampMilliseconds(b.reportDate)
        )
        .map((snapshot) => {
          const budget =
            snapshot.revisedCostCr ?? snapshot.originalCostCr ?? 0;
          const expenditure = snapshot.cumulativeExpenditureCr ?? 0;
          const financialProgress =
            budget > 0 ? (expenditure / budget) * 100 : 0;

          return {
            date: formatDate(snapshot.reportDate),
            physicalProgress: snapshot.physicalProgressPct ?? 0,
            financialProgress,
          };
        }),
    [projectSnapshots]
  );


const costProgressContext = useMemo(() => {
  if (costProgressTrendData.length === 0) {
    return null;
  }

  const latest =
    costProgressTrendData[
      costProgressTrendData.length - 1
    ];

  const gap =
    latest.financialProgress -
    latest.physicalProgress;

  if (gap > 0) {
    return `Financial progress is ${gap.toFixed(
      1
    )} percentage points above physical progress in the latest available snapshot.`;
  }

  if (gap < 0) {
    return `Physical progress is ${Math.abs(
      gap
    ).toFixed(
      1
    )} percentage points above financial progress in the latest available snapshot.`;
  }

  return "Financial and physical progress are aligned in the latest available snapshot.";
}, [costProgressTrendData]);



const scheduleVarianceData = useMemo(
  () =>
    projectSnapshots
      .filter(
        (snapshot) =>
          snapshot.reportDate &&
          (snapshot.originalCompletionDate ||
            project.originalCompletionDate)
      )
      .sort(
        (a, b) =>
          getTimestampMilliseconds(a.reportDate) -
          getTimestampMilliseconds(b.reportDate)
      )
      .map((snapshot) => {
        const plannedDate =
          snapshot.originalCompletionDate ??
          project.originalCompletionDate;

        const anticipatedDate =
          snapshot.anticipatedCompletionDate ?? plannedDate;

        const revisedDate =
          snapshot.revisedCompletionDate ?? plannedDate;

        const plannedTime =
          getTimestampMilliseconds(plannedDate);

        const anticipatedTime =
          getTimestampMilliseconds(anticipatedDate);

        const revisedTime =
          getTimestampMilliseconds(revisedDate);

        const anticipatedVarianceDays = Math.round(
          (anticipatedTime - plannedTime) /
            (1000 * 60 * 60 * 24)
        );

        const revisedVarianceDays = Math.round(
          (revisedTime - plannedTime) /
            (1000 * 60 * 60 * 24)
        );

        return {
          date: formatDate(snapshot.reportDate),
          anticipatedVarianceDays,
          revisedVarianceDays,
        };
      }),
  [projectSnapshots, project]
);

const scheduleVarianceScale = useMemo(() => {
  if (scheduleVarianceData.length === 0) {
    return {
      max: 180,
      min: 180,
    };
  }

  const maximumAbsoluteVariance = Math.max(
    ...scheduleVarianceData.flatMap((item) => [
      Math.abs(item.anticipatedVarianceDays),
      Math.abs(item.revisedVarianceDays),
    ]),
    60
  );

  const scale = Math.max(
    60,
    Math.ceil(maximumAbsoluteVariance / 60) * 60
  );

  return {
    max: scale,
    min: scale,
  };
}, [scheduleVarianceData]);


const scheduleVarianceContext = useMemo(() => {
  if (scheduleVarianceData.length === 0) {
    return null;
  }

  const latest =
    scheduleVarianceData[
      scheduleVarianceData.length - 1
    ];

  const anticipatedVariance =
    latest.anticipatedVarianceDays;

  const revisedVariance =
    latest.revisedVarianceDays;

  if (
    anticipatedVariance > 0 &&
    revisedVariance > 0
  ) {
    return `The current anticipated completion is ${anticipatedVariance} days beyond the original plan, while the revised completion schedule indicates a ${revisedVariance}-day extension.`;
  }

  if (
    anticipatedVariance > 0 &&
    revisedVariance <= 0
  ) {
    return `The current anticipated completion is ${anticipatedVariance} days beyond the original plan, while the revised schedule remains aligned with or ahead of the original plan.`;
  }

  if (
    anticipatedVariance <= 0 &&
    revisedVariance > 0
  ) {
    return `The revised completion schedule indicates a ${revisedVariance}-day extension compared with the original plan, while the current anticipated completion remains aligned with or ahead of the original plan.`;
  }

  if (
    anticipatedVariance < 0 &&
    revisedVariance < 0
  ) {
    return `The current anticipated completion is ${Math.abs(
      anticipatedVariance
    )} days earlier than the original plan, while the revised schedule is ${Math.abs(
      revisedVariance
    )} days earlier.`;
  }

  return "The reported anticipated and revised schedules are aligned with the original completion plan.";
}, [scheduleVarianceData]);


/* =========================================
   RISK TREND DATA
========================================= */

const riskTrendSnapshots = projectSnapshots
  .filter(
    (snapshot) =>
      snapshot.reportDate &&
      typeof snapshot.physicalProgressPct === "number"
  )
  .sort(
    (a, b) =>
      getTimestampMilliseconds(a.reportDate) -
      getTimestampMilliseconds(b.reportDate)
  );

const riskTrendData = riskTrendSnapshots.map(
  (snapshot, index) => {

    const physicalProgress =
      snapshot.physicalProgressPct ?? 0;

    /* -----------------------------------------
       FINANCIAL PROGRESS / COST VARIANCE
    ----------------------------------------- */

    const budget =
      snapshot.revisedCostCr ??
      snapshot.originalCostCr ??
      0;

    const actualCost =
      snapshot.cumulativeExpenditureCr ?? 0;

    const financialProgress =
      budget > 0
        ? (actualCost / budget) * 100
        : physicalProgress;

    const costVariance =
      financialProgress - physicalProgress;

    const costRisk = Math.min(
      Math.max(costVariance * 2, 0),
      100
    );

    /* -----------------------------------------
       SCHEDULE RISK
    ----------------------------------------- */

    let scheduleRisk = 0;

    const startDate =
      project.startDate ??
      project.approvalDate;

    const completionDate =
      project.originalCompletionDate;

    if (
      startDate &&
      completionDate &&
      snapshot.reportDate
    ) {

      const startTime =
        getTimestampMilliseconds(startDate);

      const completionTime =
        getTimestampMilliseconds(completionDate);

      const reportTime =
        getTimestampMilliseconds(
          snapshot.reportDate
        );

      const plannedDays =
        Math.max(
          (completionTime - startTime) /
            (1000 * 60 * 60 * 24),
          1
        );

      const elapsedDays =
        Math.max(
          (reportTime - startTime) /
            (1000 * 60 * 60 * 24),
          0
        );

      const expectedProgress =
        Math.min(
          (elapsedDays / plannedDays) * 100,
          100
        );

      const scheduleVariance =
        physicalProgress -
        expectedProgress;

      scheduleRisk = Math.min(
        Math.max(
          -scheduleVariance * 2,
          0
        ),
        100
      );
    }

    /* -----------------------------------------
       VELOCITY RISK
    ----------------------------------------- */

    let velocityRisk = 0;

    if (index === 0) {

      velocityRisk = 0;

    } else {

      const previousSnapshot =
        riskTrendSnapshots[index - 1];

      const previousProgress =
        previousSnapshot.physicalProgressPct ??
        0;

      const progressDelta =
        physicalProgress -
        previousProgress;

      const daysBetweenSnapshots =
        Math.max(
          (
            getTimestampMilliseconds(
              snapshot.reportDate
            ) -
            getTimestampMilliseconds(
              previousSnapshot.reportDate
            )
          ) /
            (1000 * 60 * 60 * 24),
          1
        );

      const actualVelocity =
        progressDelta /
        daysBetweenSnapshots;

      const startTime =
        getTimestampMilliseconds(
          project.startDate ??
          project.approvalDate
        );

      const completionTime =
        getTimestampMilliseconds(
          project.originalCompletionDate
        );

      const plannedDays =
        Math.max(
          (completionTime - startTime) /
            (1000 * 60 * 60 * 24),
          1
        );

      const expectedVelocity =
        100 / plannedDays;

      const velocityRatio =
        expectedVelocity > 0
          ? actualVelocity /
            expectedVelocity
          : 1;

      velocityRisk = Math.min(
        Math.max(
          (1 - velocityRatio) * 100,
          0
        ),
        100
      );
    }

    /* -----------------------------------------
       EFFICIENCY RISK
    ----------------------------------------- */

    const efficiencyRisk = Math.min(
      Math.max(costVariance * 2, 0),
      100
    );

    /* -----------------------------------------
       OVERALL RISK
    ----------------------------------------- */

    const riskScore =
      costRisk * 0.30 +
      scheduleRisk * 0.30 +
      velocityRisk * 0.20 +
      efficiencyRisk * 0.20;

    return {
      date: formatDate(snapshot.reportDate),
      riskScore: Math.round(
        riskScore * 10
      ) / 10,
    };
  }
);

const snapshotHistoryData = useMemo(() => {
  const sortedSnapshots = [...projectSnapshots]
    .filter((snapshot) => snapshot.reportDate)
    .sort(
      (a, b) =>
        getTimestampMilliseconds(a.reportDate) -
        getTimestampMilliseconds(b.reportDate)
    );

  return sortedSnapshots.map((snapshot, index) => {
    const previousSnapshot =
      index > 0
        ? sortedSnapshots[index - 1]
        : null;

    const currentProgress =
      typeof snapshot.physicalProgressPct === "number"
        ? snapshot.physicalProgressPct
        : null;

    const previousProgress =
      previousSnapshot &&
      typeof previousSnapshot.physicalProgressPct === "number"
        ? previousSnapshot.physicalProgressPct
        : null;

    const progressChange =
      currentProgress !== null &&
      previousProgress !== null
        ? currentProgress - previousProgress
        : null;

    return {
      date: formatDate(snapshot.reportDate),
      reportPeriod:
        snapshot.reportPeriod ?? "Not available",
      reportType:
        snapshot.reportType ?? "Not available",
      physicalProgress: currentProgress,
      progressChange,
      progressContext:
  progressChange === null
    ? "Baseline snapshot."
    : progressChange > 0
    ? `Progress increased by ${progressChange.toFixed(1)} percentage points since the previous snapshot.`
    : progressChange < 0
    ? `Progress decreased by ${Math.abs(progressChange).toFixed(1)} percentage points since the previous snapshot.`
    : "Progress remained unchanged since the previous snapshot.",
      cumulativeExpenditure:
        snapshot.cumulativeExpenditureCr ?? null,
      revisedCost:
        snapshot.revisedCostCr ?? null,
      projectStatus:
        snapshot.projectStatus ?? "Not available",
      remarks:
        snapshot.remarks ?? "No remarks available.",
    };
  });
}, [projectSnapshots]);

const riskTrendContext = useMemo(() => {
  if (riskTrendData.length < 2) {
    return null;
  }

  const firstRisk =
    riskTrendData[0].riskScore;

  const latestRisk =
    riskTrendData[riskTrendData.length - 1].riskScore;

  const change = latestRisk - firstRisk;

if (change > 0) {
  return `Calculated execution risk increased by ${change.toFixed(
    1
  )} points across the available snapshots.`;
}

if (change < 0) {
  return `Calculated execution risk decreased by ${Math.abs(
    change
  ).toFixed(1)} points across the available snapshots.`;
}

return "Calculated execution risk remained stable across the available snapshots.";
}, [riskTrendData]);

  /* =========================================
     LOADING & ERROR STATES
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

  if (error) {
    return (
      <div className="project-details-page">
        <div className="project-details-message error">
          <p>{error}</p>
          <button type="button" onClick={() => window.location.reload()}>
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
        <div className="project-header-info">
          <button
            type="button"
            className="back-button"
            onClick={onBack}
          >
            ← Back to Projects
          </button>
          <h1>{project.projectName}</h1>
          <p>Project ID: {project.projectId}</p>
        </div>

        <div className="project-header-actions">
          {latestSnapshot?.projectStatus && (
            <div
              className={`project-status-badge status-${latestSnapshot.projectStatus.toLowerCase()}`}
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

          {onDelete && (
            <button
              type="button"
              className="delete-project-button"
              onClick={handleDeleteProject}
              disabled={deleting}
            >
              {deleting
                ? "Deleting..."
                : deleteConfirming
                  ? "Confirm Delete"
                  : "Delete Project"}
            </button>
          )}
        </div>
      </div>

      {deleteError && (
        <div className="delete-project-error">
          {deleteError}
        </div>
      )}

      {/* =====================================
          BASIC INFORMATION
      ====================================== */}
      <section className="details-card">
        <h2>Basic Information</h2>
        <div className="details-grid">
          <div className="detail-item">
            <span>Project ID</span>
            <strong>{project.projectId}</strong>
          </div>

          <div className="detail-item">
            <span>Project Name</span>
            <strong>{project.projectName}</strong>
          </div>

          <div className="detail-item">
            <span>Ministry</span>
            <strong>{project.ministry}</strong>
          </div>

          <div className="detail-item">
            <span>Data Source</span>
            <strong>{project.dataSource}</strong>
          </div>

          <div className="detail-item full-width">
            <span>Source Project Code</span>
            <strong>{project.sourceProjectCode ?? "Not available"}</strong>
          </div>
        </div>
      </section>

      {/* =====================================
          CLASSIFICATION
      ====================================== */}
      <section className="details-card">
        <h2>Classification</h2>
        <div className="details-grid">
          <div className="detail-item">
            <span>Domain</span>
            <strong>{project.domain}</strong>
          </div>

          <div className="detail-item">
            <span>Project Type</span>
            <strong>{project.projectType ?? "Not available"}</strong>
          </div>
        </div>
      </section>

      {/* =====================================
          IMPLEMENTING ORGANIZATION
      ====================================== */}
      <section className="details-card">
        <h2>Organization</h2>
        <div className="details-grid">
          <div className="detail-item full-width">
            <span>Implementing Agency</span>
            <strong>{project.implementingAgency ?? "Not available"}</strong>
          </div>
        </div>
      </section>

      {/* =====================================
          LOCATION
      ====================================== */}
      <section className="details-card">
        <h2>Location</h2>
        <div className="details-grid">
          <div className="detail-item">
            <span>State</span>
            <strong>{project.state ?? "Not available"}</strong>
          </div>

          <div className="detail-item">
            <span>District / Location</span>
            <strong>{project.districtOrLocation ?? "Not available"}</strong>
          </div>
        </div>
      </section>

      {/* =====================================
          ORIGINAL PROJECT INFORMATION
      ====================================== */}
      <section className="details-card">
        <h2>Original Project Information</h2>
        <div className="details-grid">
          <div className="detail-item">
            <span>Approval Date</span>
            <strong>{formatDate(project.approvalDate)}</strong>
          </div>
          <div className="detail-item">
            <span>Project Start Date</span>
            <strong>{formatDate(project.startDate)}</strong>
          </div>

          <div className="detail-item">
            <span>Original Project Cost</span>
            <strong>{formatCrore(project.originalCostCr)}</strong>
          </div>

          <div className="detail-item full-width">
            <span>Original Completion Date</span>
            <strong>{formatDate(project.originalCompletionDate)}</strong>
          </div>
        </div>
      </section>

      {/* =====================================
          PROJECT EXECUTION TIMELINE
      ====================================== */}
      <section className="details-card project-timeline-section">
        <div className="timeline-header">
          <div>
            <h2>Project Execution Timeline</h2>
            <p>Key milestones from project approval to the latest reported status.</p>
          </div>
        </div>

        <div className="project-timeline">
          {projectTimeline.map((item, index) => (
            <div
              key={`${item.label}-${index}`}
              className={`timeline-item ${item.type}`}
            >
              <div className="timeline-marker">
                <span />
              </div>

              <div className="timeline-content">
                <span className="timeline-label">{item.label}</span>
                <strong className="timeline-date">{item.date}</strong>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================
          PROGRESS TREND
      ====================================== */}
      <section className="details-card progress-trend-section">
        <div className="progress-trend-header">
          <div>
            <h2>Physical Progress Trend</h2>
            <p>Reported physical progress across project snapshots.</p>
          </div>

          <div className="progress-trend-summary">
            <span>Latest</span>
            <strong>{latestSnapshot?.physicalProgressPct ?? 0}%</strong>
          </div>
        </div>

        <div className="progress-trend-recharts">
  <ResponsiveContainer width="100%" height={320}>
    <LineChart
      data={progressTrendData}
      margin={{
        top: 20,
        right: 24,
        left: 8,
        bottom: 12,
      }}
    >
      <CartesianGrid
        strokeDasharray="3 3"
        stroke="rgba(86, 112, 150, 0.18)"
      />

      <XAxis
        dataKey="date"
        tick={{
          fill: "var(--color-text-secondary)",
          fontSize: 11,
        }}
        tickLine={false}
        axisLine={{
          stroke: "var(--color-border)",
        }}
        interval="preserveStartEnd"
      />

      <YAxis
        domain={[0, 100]}
        tick={{
          fill: "var(--color-text-secondary)",
          fontSize: 11,
        }}
        tickLine={false}
        axisLine={false}
        tickFormatter={(value) => `${value}%`}
      />

      <Tooltip
        contentStyle={{
          background: "var(--color-card)",
          border: "1px solid var(--color-border)",
          borderRadius: "10px",
        }}
        labelStyle={{
          color: "var(--color-text-primary)",
          fontWeight: 600,
          marginBottom: "6px",
        }}
        formatter={(value) => [
          `${Number(value).toFixed(1)}%`,
          "Physical Progress",
        ]}
      />

      <Line
        type="monotone"
        dataKey="progress"
        name="Physical Progress"
        stroke="var(--color-primary)"
        strokeWidth={2.5}
        dot={{
          r: 4,
          fill: "var(--color-primary)",
          stroke: "var(--color-card)",
          strokeWidth: 2,
        }}
        activeDot={{
          r: 6,
        }}
      />
    </LineChart>
  </ResponsiveContainer>
</div>
        {progressTrendContext && (
  <div className="progress-trend-context">
    <span className="benchmark-insight-label">
      Trend Context
    </span>

    <p>
      {progressTrendContext}
    </p>
  </div>
)}
      </section>

      {/* =====================================
          COST vs PHYSICAL PROGRESS
      ====================================== */}
      <section className="details-card cost-progress-section">
        <div className="cost-progress-header">
          <div>
            <h2>Cost vs Physical Progress</h2>
            <p>Comparison of cumulative financial progress against reported physical progress.</p>
          </div>
        </div>

        {costProgressTrendData.length >= 2 ? (
         <div className="cost-progress-recharts">
  <ResponsiveContainer width="100%" height={320}>
    <LineChart
      data={costProgressTrendData}
      margin={{
        top: 20,
        right: 24,
        left: 8,
        bottom: 12,
      }}
    >
      <CartesianGrid
        strokeDasharray="3 3"
        stroke="rgba(86, 112, 150, 0.18)"
      />

      <XAxis
        dataKey="date"
        tick={{
          fill: "var(--color-text-secondary)",
          fontSize: 11,
        }}
        tickLine={false}
        axisLine={{
          stroke: "var(--color-border)",
        }}
        interval="preserveStartEnd"
      />

      <YAxis
        domain={[0, 100]}
        tick={{
          fill: "var(--color-text-secondary)",
          fontSize: 11,
        }}
        tickLine={false}
        axisLine={false}
        tickFormatter={(value) => `${value}%`}
      />

      <Tooltip
        contentStyle={{
          background: "var(--color-card)",
          border: "1px solid var(--color-border)",
          borderRadius: "10px",
        }}
        labelStyle={{
          color: "var(--color-text-primary)",
          fontWeight: 600,
          marginBottom: "6px",
        }}
        formatter={(value, name) => [
          `${Number(value).toFixed(1)}%`,
          name,
        ]}
      />

      <Line
        type="monotone"
        dataKey="physicalProgress"
        name="Physical Progress"
        stroke="var(--color-primary)"
        strokeWidth={2.5}
        dot={{
          r: 4,
          fill: "var(--color-primary)",
          stroke: "var(--color-card)",
          strokeWidth: 2,
        }}
        activeDot={{
          r: 6,
        }}
      />

      <Line
        type="monotone"
        dataKey="financialProgress"
        name="Financial Progress"
        stroke="var(--color-info)"
        strokeWidth={2.5}
        dot={{
          r: 4,
          fill: "var(--color-info)",
          stroke: "var(--color-card)",
          strokeWidth: 2,
        }}
        activeDot={{
          r: 6,
        }}
      />
    </LineChart>
  </ResponsiveContainer>
</div>
        ) : (
          <div className="no-data-message">
            At least two project snapshots with financial and physical progress data are required to display this comparison.
          </div>
        )}

        {costProgressContext && (
  <div className="cost-progress-context">
    <span className="benchmark-insight-label">
      Execution Context
    </span>

    <p>
      {costProgressContext}
    </p>
  </div>
)}

        <div className="cost-progress-legend">
          <div className="legend-item">
            <span className="legend-dot physical" />
            <span>Physical Progress</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot financial" />
            <span>Financial Progress</span>
          </div>
        </div>
      </section>




      {/* =====================================
          SCHEDULE VARIANCE
      ====================================== */}
      <section className="details-card schedule-variance-section">
        <div className="schedule-variance-header">
          <div>
            <h2>Schedule Variance</h2>
            <p>Change in planned completion timeline across project snapshots.</p>
          </div>
        </div>

       {scheduleVarianceData.length >= 1 ? (
  <div className="schedule-variance-recharts">
    <ResponsiveContainer width="100%" height={340}>
      <LineChart
        data={scheduleVarianceData}
        margin={{
          top: 20,
          right: 24,
          left: 8,
          bottom: 12,
        }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(86, 112, 150, 0.18)"
        />

        <XAxis
          dataKey="date"
          tick={{
            fill: "var(--color-text-secondary)",
            fontSize: 11,
          }}
          tickLine={false}
          axisLine={{
            stroke: "var(--color-border)",
          }}
          interval="preserveStartEnd"
        />

        <YAxis
          tick={{
            fill: "var(--color-text-secondary)",
            fontSize: 11,
          }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}d`}
          allowDecimals={false}
        />

        <Tooltip
          contentStyle={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "10px",
            color: "var(--color-text-primary)",
          }}
          labelStyle={{
            color: "var(--color-text-primary)",
            fontWeight: 600,
            marginBottom: "6px",
          }}
          formatter={(value, name) => [
            `${value} days`,
            name,
          ]}
        />

        <Line
          type="monotone"
          dataKey="anticipatedVarianceDays"
          name="Anticipated Completion"
          stroke="var(--color-primary)"
          strokeWidth={2.5}
          dot={{
            r: 4,
            fill: "var(--color-primary)",
            stroke: "var(--color-card)",
            strokeWidth: 2,
          }}
          activeDot={{
            r: 6,
          }}
        />

        <Line
          type="monotone"
          dataKey="revisedVarianceDays"
          name="Revised Completion"
          stroke="var(--color-info)"
          strokeWidth={2.5}
          dot={{
            r: 4,
            fill: "var(--color-info)",
            stroke: "var(--color-card)",
            strokeWidth: 2,
          }}
          activeDot={{
            r: 6,
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
) : (
  <div className="no-data-message">
    Schedule completion data is not available for the project snapshots.
  </div>
)}



        {scheduleVarianceContext && (
  <div className="schedule-variance-context">
    <span className="benchmark-insight-label">
      Schedule Context
    </span>

    <p>
      {scheduleVarianceContext}
    </p>
  </div>
)}

<div className="schedule-series-legend">
  <div className="legend-item">
    <span className="schedule-series-dot anticipated" />
    <span>Anticipated Completion</span>
  </div>

  <div className="legend-item">
    <span className="schedule-series-dot revised" />
    <span>Revised Completion</span>
  </div>
</div>

        <div className="schedule-variance-legend">
          <div className="legend-item">
            <span className="legend-dot delayed" />
            <span>Delayed</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot ahead" />
            <span>Ahead of Plan</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot on-schedule" />
            <span>On Schedule</span>
          </div>
        </div>
      </section>

      {/* =====================================
          RISK TREND
      ====================================== */}
      <section className="details-card risk-trend-section">
        <div className="risk-trend-header">
         <div>
  <h2>Execution Risk Trend</h2>
  <p>
    Historical movement of NeevAI's calculated execution-risk indicator
    across project snapshots.
  </p>
</div>

{riskTrendData.length > 0 && (
  <div className="risk-trend-summary">
    <span>Latest Execution Risk</span>
    <strong>
      {riskTrendData[riskTrendData.length - 1].riskScore}
    </strong>
    <small>/ 100</small>
  </div>
)}
        </div>

        {riskTrendData.length >= 2 ? (
          <div className="risk-trend-recharts">
  <ResponsiveContainer width="100%" height={320}>
    <LineChart
      data={riskTrendData}
      margin={{
        top: 20,
        right: 24,
        left: 8,
        bottom: 12,
      }}
    >
      <CartesianGrid
        strokeDasharray="3 3"
        stroke="rgba(86, 112, 150, 0.18)"
      />

      <XAxis
        dataKey="date"
        tick={{
          fill: "var(--color-text-secondary)",
          fontSize: 11,
        }}
        tickLine={false}
        axisLine={{
          stroke: "var(--color-border)",
        }}
        interval="preserveStartEnd"
      />

      <YAxis
        domain={[0, 100]}
        tick={{
          fill: "var(--color-text-secondary)",
          fontSize: 11,
        }}
        tickLine={false}
        axisLine={false}
        tickFormatter={(value) => `${value}`}
      />

      <Tooltip
        contentStyle={{
          background: "var(--color-card)",
          border: "1px solid var(--color-border)",
          borderRadius: "10px",
        }}
        labelStyle={{
          color: "var(--color-text-primary)",
          fontWeight: 600,
          marginBottom: "6px",
        }}
        formatter={(value) => [
          `${Number(value).toFixed(1)} / 100`,
          "Execution Risk",
        ]}
      />

      <Line
        type="monotone"
        dataKey="riskScore"
        name="Execution Risk"
        stroke="var(--color-primary)"
        strokeWidth={2.5}
        dot={{
          r: 4,
          fill: "var(--color-primary)",
          stroke: "var(--color-card)",
          strokeWidth: 2,
        }}
        activeDot={{
          r: 6,
        }}
      />
    </LineChart>
  </ResponsiveContainer>
</div>
        ) : (
          <div className="no-data-message">
            At least two project snapshots are required to display the risk trend.
          </div>
        )}

        <div className="risk-trend-legend">
          <div className="legend-item">
            <span className="legend-dot low" />
            <span>Low</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot medium" />
            <span>Medium</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot high" />
            <span>High</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot critical" />
            <span>Critical</span>
          </div>
        </div>
        {riskTrendContext && (
  <div className="risk-trend-context">
    <span className="benchmark-insight-label">
      Risk Context
    </span>

    <p>
      {riskTrendContext}
    </p>
  </div>
)}
      </section>

      {/* =====================================
          LATEST SNAPSHOT
      ====================================== */}
      <section className="details-card">
        <h2>Latest Project Snapshot</h2>

        {latestSnapshot ? (
          <div className="details-grid">
            <div className="detail-item">
              <span>Report Type</span>
              <strong>{latestSnapshot.reportType}</strong>
            </div>

            <div className="detail-item">
              <span>Report Period</span>
              <strong>{latestSnapshot.reportPeriod}</strong>
            </div>

            <div className="detail-item">
              <span>Report Date</span>
              <strong>{formatDate(latestSnapshot.reportDate)}</strong>
            </div>

            <div className="detail-item">
              <span>Current Status</span>
              <strong>{latestSnapshot.projectStatus ?? "No Data"}</strong>
            </div>

            <div className="detail-item">
              <span>Revised Cost</span>
              <strong>{formatCrore(latestSnapshot.revisedCostCr)}</strong>
            </div>

            <div className="detail-item">
              <span>Anticipated Cost</span>
              <strong>{formatCrore(latestSnapshot.anticipatedCostCr)}</strong>
            </div>

            <div className="detail-item">
              <span>Cumulative Expenditure</span>
              <strong>{formatCrore(latestSnapshot.cumulativeExpenditureCr)}</strong>
            </div>

            <div className="detail-item">
              <span>Physical Progress</span>
              <strong>{latestSnapshot.physicalProgressPct ?? 0}%</strong>
            </div>

            <div className="detail-item">
              <span>Revised Completion Date</span>
              <strong>{formatDate(latestSnapshot.revisedCompletionDate)}</strong>
            </div>

            <div className="detail-item">
              <span>Anticipated Completion Date</span>
              <strong>{formatDate(latestSnapshot.anticipatedCompletionDate)}</strong>
            </div>

            <div className="detail-item full-width">
              <span>Remarks</span>
              <p>{latestSnapshot.remarks ?? "No remarks available."}</p>
            </div>
          </div>
        ) : (
          <div className="no-data-message">
            No project snapshot available.
          </div>
        )}
      </section>

{/* =====================================
    SNAPSHOT EXECUTION HISTORY
====================================== */}
<section className="details-card snapshot-history-section">
  <div className="snapshot-history-header">
    <div>
      <h2>Snapshot Execution History</h2>
     <p>
  Historical project execution records across available reporting snapshots,
  ordered from earliest to latest.
</p>
    </div>

    <span className="snapshot-history-count">
      {snapshotHistoryData.length} Snapshots
    </span>
  </div>

  {snapshotHistoryData.length > 0 ? (
    <div className="snapshot-history-list">
      {snapshotHistoryData.map((snapshot, index) => (
        <div
          className="snapshot-history-item"
          key={`${snapshot.date}-${snapshot.reportPeriod}-${index}`}
        >
        <div className="snapshot-history-date">
  <span>{snapshot.date}</span>
  <small>{snapshot.reportPeriod}</small>
  <em>{snapshot.reportType}</em>
</div>


          <div className="snapshot-history-content">
            <div className="snapshot-history-top">
              <strong>{snapshot.reportType}</strong>

         <span
  className={`snapshot-history-status status-${snapshot.projectStatus
    .toLowerCase()
    .replace(/\s+/g, "-")}`}
>
  <span className="snapshot-history-status-dot" />
  {snapshot.projectStatus}
</span>
            </div>

            <div className="snapshot-history-metrics">
              <div>
                <span>Physical Progress</span>
                <strong>
                  {snapshot.physicalProgress !== null
                    ? `${snapshot.physicalProgress}%`
                    : "No Data"}
                </strong>
              </div>

              <div>
                <span>Cumulative Expenditure</span>
                <strong>
                  {snapshot.cumulativeExpenditure !== null
                    ? `₹ ${snapshot.cumulativeExpenditure.toFixed(2)} Cr`
                    : "No Data"}
                </strong>
              </div>

              <div>
                <span>Revised Cost</span>
                <strong>
                  {snapshot.revisedCost !== null
                    ? `₹ ${snapshot.revisedCost.toFixed(2)} Cr`
                    : "No Data"}
                </strong>
              </div>
            </div>

            <div className="snapshot-history-change">
              <span>Progress Change</span>
              <strong>
                {snapshot.progressChange === null
                  ? "Baseline"
                  : snapshot.progressChange > 0
                  ? `↑ +${snapshot.progressChange.toFixed(1)} pp`
                  : snapshot.progressChange < 0
                  ? `↓ ${snapshot.progressChange.toFixed(1)} pp`
                  : "→ 0.0 pp"}
              </strong>
            </div>


            <p className="snapshot-history-remarks">
  {snapshot.remarks}
</p>

<p className="snapshot-history-progress-context">
  {snapshot.progressContext}
</p>
          </div>
        </div>
      ))}
    </div>
  ) : (
   <div className="snapshot-history-empty">
  <strong>No Snapshot History Available</strong>
  <p>
    Historical execution records will appear here when project snapshots are available.
  </p>
</div>
  )}
</section>

      {/* =====================================
          PHYSICAL PROGRESS BAR
      ====================================== */}
      <section className="details-card">
        <h2>Physical Progress</h2>
        <div className="progress-section">
          <div className="progress-info">
            <span>Latest Reported Progress</span>
            <strong>{latestSnapshot?.physicalProgressPct ?? 0}%</strong>
          </div>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(
                  Math.max(latestSnapshot?.physicalProgressPct ?? 0, 0),
                  100
                )}%`,
              }}
            />
          </div>
        </div>
      </section>

      {/* =====================================
          NEXT-MONTH PROGRESS FORECAST
      ====================================== */}
      <section className="details-card temporal-forecast-section">
        <div className="temporal-forecast-header">
          <div>
            <h2>Next-Month Progress Forecast</h2>
            <p>Temporal ML forecast based on the latest project execution and financial indicators.</p>
          </div>
          <div className="temporal-forecast-badge">Temporal ML</div>
        </div>

        {temporalPredictionLoading ? (
          <div className="no-data-message">Generating next-month progress forecast...</div>
        ) : temporalPredictionError ? (
          <div className="no-data-message">
            <p>Progress forecast unavailable.</p>
            <small>{temporalPredictionError}</small>
          </div>
        ) : temporalPrediction ? (
          <>
            <div className="temporal-forecast-main">
              <div className="temporal-progress-box">
                <span>Current Progress</span>
                <strong>
                  {typeof temporalPrediction.prediction
                    .current_physical_progress_pct === "number"
                    ? temporalPrediction.prediction.current_physical_progress_pct.toFixed(2)
                    : "—"}
                  %
                </strong>
              </div>

              <div className="temporal-forecast-arrow">→</div>

              <div className="temporal-progress-box forecast">
                <span>Next-Month Forecast</span>
                <strong>
                  {typeof temporalPrediction.prediction
                    .predicted_next_month_physical_progress_pct === "number"
                    ? temporalPrediction.prediction.predicted_next_month_physical_progress_pct.toFixed(2)
                    : "—"}
                  %
                </strong>
              </div>

              <div className="temporal-change-box">
                <span>Expected Change</span>
                <strong>
                  {typeof temporalPrediction.prediction
                    .predicted_progress_change_pct === "number"
                    ? `${
                        temporalPrediction.prediction.predicted_progress_change_pct >= 0
                          ? "+"
                          : ""
                      }${temporalPrediction.prediction.predicted_progress_change_pct.toFixed(2)}%`
                    : "—"}
                </strong>
              </div>
            </div>

            <div className="temporal-forecast-note">
              Forecast values are model estimates for decision support and are not guaranteed outcomes.
            </div>

            <div className="temporal-forecast-meta">
              <div>
                <span>Model</span>
                <strong>{temporalPrediction.prediction.model_version}</strong>
              </div>
              <div>
                <span>Features</span>
                <strong>{temporalPrediction.prediction.feature_count}</strong>
              </div>
              <div>
                <span>Based On</span>
                <strong>{temporalPrediction.snapshot.reportPeriod}</strong>
              </div>
            </div>

            {/* =====================================
              TEMPORAL FORECAST VISUAL
                ====================================== */}

{temporalPrediction && (
  <div className="temporal-forecast-visual">

    <div className="temporal-visual-header">
      <span>Progress Projection</span>

      <span>
        {temporalPrediction.prediction.current_physical_progress_pct.toFixed(1)}%
        {" → "}
        {temporalPrediction.prediction.predicted_next_month_physical_progress_pct.toFixed(1)}%
      </span>
    </div>

    <div className="temporal-progress-track">

      <div
        className="temporal-current-progress"
        style={{
          width: `${Math.min(
            Math.max(
              temporalPrediction.prediction.current_physical_progress_pct,
              0
            ),
            100
          )}%`,
        }}
      />

      <div
        className="temporal-forecast-marker"
        style={{
          left: `${Math.min(
            Math.max(
              temporalPrediction.prediction.predicted_next_month_physical_progress_pct,
              0
            ),
            100
          )}%`,
        }}
      >
        <span>
          Forecast
        </span>
      </div>

    </div>

    <div className="temporal-progress-scale">
      <span>0%</span>
      <span>25%</span>
      <span>50%</span>
      <span>75%</span>
      <span>100%</span>
    </div>

  </div>
)}
{temporalPrediction && (
  <div className="temporal-decision-context">
    <span className="benchmark-insight-label">
      Forecast Context
    </span>

    <p>
      The model forecasts the project's next-month physical
      progress from its current execution indicators.
    </p>
  </div>
)}

            {(() => {
              const currentProgress =
                temporalPrediction.prediction.current_physical_progress_pct;
              const predictedProgress =
                temporalPrediction.prediction.predicted_next_month_physical_progress_pct;
              const progressChange =
                temporalPrediction.prediction.predicted_progress_change_pct;

              const interpretation = getTemporalForecastInterpretation(
                currentProgress,
                predictedProgress,
                progressChange
              );

              return (
                <div className="temporal-forecast-interpretation">
                  <div className="temporal-interpretation-icon">✦</div>
                  <div className="temporal-interpretation-content">
                    <span>AI Interpretation</span>
                    <strong>{interpretation.title}</strong>
                    <p>{interpretation.message}</p>
                  </div>
                </div>
              );
            })()}
          </>
        ) : (
          <div className="no-data-message">
            No next-month progress forecast available.
          </div>
        )}
      </section>

      {/* =====================================
          AI RISK PREDICTION
      ====================================== */}
      <section className="details-card">
        <h2>AI Risk Prediction</h2>

        {mlPrediction && (
          <div className="risk-summary-card">
            <div className="risk-summary-label">AI Risk Assessment</div>

           <div className="risk-summary-main">
  <div className="risk-summary-metric">
    <span>Predicted Risk Score</span>
    <strong>
      {typeof mlPrediction.prediction?.predicted_risk_score === "number"
        ? mlPrediction.prediction.predicted_risk_score.toFixed(1)
        : "—"}
      <small>/ 100</small>
    </strong>
  </div>

  <div className="risk-summary-metric">
    <span>Risk Category</span>
    <strong>
      {mlPrediction.prediction?.risk_category ?? "—"}
    </strong>
  </div>

  <div className="risk-summary-metric">
    <span>Model Version</span>
    <strong>
      {mlPrediction.prediction?.model_version ?? "—"}
    </strong>
  </div>
</div>
            <p>
              The risk assessment combines the available project execution indicators with the trained machine-learning prediction to highlight the factors contributing to the current project risk.
            </p>
          </div>
        )}

        {mlPredictionLoading ? (
          <div className="no-data-message">Generating AI prediction...</div>
        ) : mlPredictionError ? (
          <div className="no-data-message">
            <p>AI prediction unavailable.</p>
            <small>{mlPredictionError}</small>
          </div>
        ) : mlPrediction ? (
          <div className="details-grid">
            <div className="detail-item">
              <span>Predicted Delay</span>
              <strong>
                {typeof mlPrediction.prediction.predicted_delay_months === "number"
                  ? mlPrediction.prediction.predicted_delay_months.toFixed(1)
                  : "—"}{" "}
                months
              </strong>
            </div>

            <div className="detail-item">
              <span>Predicted Cost Overrun</span>
              <strong>
                {typeof mlPrediction.prediction.predicted_cost_overrun_pct === "number"
                  ? mlPrediction.prediction.predicted_cost_overrun_pct.toFixed(2)
                  : "—"}
                %
              </strong>
            </div>

            <div className="detail-item">
              <span>Predicted Cost Overrun Amount</span>
              <strong>
                ₹{" "}
                {typeof mlPrediction.prediction.predicted_cost_overrun_cr === "number"
                  ? mlPrediction.prediction.predicted_cost_overrun_cr.toFixed(2)
                  : "—"}{" "}
                Cr
              </strong>
            </div>

            <div className="detail-item">
              <span>Risk Score</span>
              <strong>
                {typeof mlPrediction.prediction.predicted_risk_score === "number"
                  ? mlPrediction.prediction.predicted_risk_score.toFixed(1)
                  : "—"}{" "}
                / 100
              </strong>
            </div>

            <div className="detail-item">
              <span>Risk Category</span>
              <strong>{mlPrediction.prediction.risk_category}</strong>
            </div>

            <div className="detail-item">
              <span>Model Version</span>
              <strong>{mlPrediction.prediction.model_version}</strong>
            </div>

            <div className="detail-item">
              <span>Features Used</span>
              <strong>{mlPrediction.prediction.feature_count}</strong>
            </div>

            <div className="detail-item">
              <span>Prediction Report</span>
              <strong>{mlPrediction.snapshot.reportPeriod}</strong>
            </div>

            <div className="ai-risk-interpretation">
              {(() => {
                const riskScore = mlPrediction.prediction.predicted_risk_score;
                const predictedDelay = mlPrediction.prediction.predicted_delay_months;
                const predictedCostOverrun = mlPrediction.prediction.predicted_cost_overrun_pct;

                const interpretation = getRiskInterpretation(
                  riskScore,
                  mlPrediction.prediction.risk_category,
                  predictedDelay,
                  predictedCostOverrun
                );

                return (
                  <>
                    <div className="ai-risk-interpretation-icon">✦</div>
                    <div className="ai-risk-interpretation-content">
                 <span>Prediction Interpretation</span>
                      <strong>{interpretation.title}</strong>
                     <p>
  This interpretation is based on the model's predicted risk score,
  expected delay, and predicted cost overrun for the current project snapshot.
</p>
                    </div>
                  </>
                );
              })()}
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
      ====================================== */}
      <section className="details-card risk-explanation-section">
        <div className="risk-explanation-header">
          <div>
            <h2>Why This Project Is At Risk</h2>
            <p>Key project factors contributing to the current risk assessment.</p>
          </div>
          <div className="explanation-badge">AI Explainability</div>
        </div>

        {riskExplanations.length === 0 ? (
          <div className="no-explanation-message">
            <span className="explanation-check">✓</span>
            <div>
              <strong>Insufficient risk indicators</strong>
              <p>More project data is required to generate an explanation.</p>
            </div>
          </div>
        ) : (
          <div className="risk-explanation-list">
            {riskExplanations.map((item, index) => (
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
                    <strong>{item.factor}</strong>
                    <span className="risk-factor-value">{item.value}</span>
                  </div>
                  <p>{item.explanation}</p>
                </div>

                <span className={`risk-factor-severity ${item.severity}`}>
                  {item.severity}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* =====================================
          COST ESCALATION ANALYSIS
      ====================================== */}
      <section className="details-card cost-analysis-section">
        <div className="cost-analysis-header">
          <div>
            <h2>Cost Escalation Analysis</h2>
            <p>Comparison of approved and revised project cost.</p>
          </div>
          <div className="cost-analysis-badge">Financial Analysis</div>
        </div>

        {originalCost !== null ? (
          <div className="cost-analysis-grid">
            <div className="cost-analysis-item">
              <span>Original Approved Cost</span>
              <strong>₹{originalCost.toFixed(2)} Cr</strong>
            </div>

            <div className="cost-analysis-item">
              <span>Revised Cost</span>
              <strong>
                {revisedCost !== null
                  ? `₹${revisedCost.toFixed(2)} Cr`
                  : "Not available"}
              </strong>
            </div>

            <div className="cost-analysis-item">
              <span>Cost Increase</span>
              <strong
                className={
                  costIncreasePct !== null && costIncreasePct > 0
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
            Cost escalation cannot be calculated from the available project data.
          </div>
        )}
      </section>

      {/* =====================================
          EARLY WARNING SIGNALS
      ====================================== */}
      <section className="details-card early-warning-section">
        <div className="early-warning-header">
          <div>
            <h2>Early Warning Signals</h2>
            <p>Potential project risks identified from current project indicators and AI predictions.</p>
          </div>

          <div className="warning-summary">
            <div className="warning-summary-item">
              <span>Total Alerts</span>
              <strong>{earlyWarnings.length}</strong>
            </div>

            <div className="warning-summary-item high">
              <span>High</span>
              <strong>
                {
                  earlyWarnings.filter(
                    (warning) => warning.severity === "high"
                  ).length
                }
              </strong>
            </div>

            <div className="warning-summary-item medium">
              <span>Medium</span>
              <strong>
                {
                  earlyWarnings.filter(
                    (warning) => warning.severity === "medium"
                  ).length
                }
              </strong>
            </div>
          </div>
        </div>

        {earlyWarnings.length === 0 ? (
          <div className="no-warning-message">
            <span className="warning-check">✓</span>
            <div>
              <strong>No active warning signals</strong>
              <p>No significant risk indicators were detected from the available project data.</p>
            </div>
          </div>
        ) : (
          <div className="warning-list">
            {earlyWarnings.map((warning, index) => (
              <div
                key={`${warning.title}-${index}`}
                className={`warning-item ${warning.severity}`}
              >
                <div className="warning-icon">!</div>

                <div className="warning-content">
                  <div className="warning-title-row">
                    <strong>{warning.title}</strong>
                    <span className={`warning-severity ${warning.severity}`}>
                      {warning.severity === "high" ? "High" : "Medium"}
                    </span>
                  </div>
                  <p>{warning.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* =====================================
          AI EXPLANATION
      ====================================== */}
      <section className="details-card explanation-section">
        <div className="explanation-header">
          <div>
            <h2>Why did AI give this prediction?</h2>
            <p>Key project factors contributing to the current AI prediction.</p>
          </div>

          {mlPrediction && (
            <div className="explanation-score">
              Risk Score{" "}
              <strong>
                {typeof mlPrediction.prediction.predicted_risk_score === "number"
                  ? mlPrediction.prediction.predicted_risk_score.toFixed(1)
                  : "—"}
              </strong>
              /100
            </div>
          )}
        </div>

        {mlPredictionLoading ? (
          <div className="prediction-loading">Analysing project factors...</div>
        ) : explanationFactors.length === 0 ? (
          <div className="no-explanation-message">
            <span className="explanation-info-icon">i</span>
            <div>
              <strong>Explanation unavailable</strong>
              <p>Additional project data is required to explain the current prediction.</p>
            </div>
          </div>
        ) : (
          <div className="explanation-list">
            {explanationFactors.map((factor, index) => (
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
                    <strong>{factor.title}</strong>
                    <div className="explanation-factor-meta">
                      <span className="explanation-value">{factor.value}</span>
                      <span className={`explanation-impact ${factor.impact}`}>
                        {factor.impact === "high"
                          ? "High Impact"
                          : factor.impact === "medium"
                          ? "Medium Impact"
                          : "Low Impact"}
                      </span>
                    </div>
                  </div>
                  <p>{factor.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* =====================================
          BENCHMARKING
      ====================================== */}
      <section className="details-card benchmarking-section">
        <div className="benchmarking-header">
          <div>
            <h2>Benchmarking & Similar Projects</h2>
            <p>Comparison with other real projects from the same domain available in the system.</p>
          </div>
          <div className="benchmark-count">
            {benchmarkProjects.length}{" "}
            {benchmarkProjects.length === 1 ? "Project" : "Projects"}
          </div>
        </div>

        {benchmarkLoading ? (
          <div className="benchmark-message">Loading similar projects...</div>
        ) : benchmarkError ? (
          <div className="benchmark-message error">
            <strong>Benchmarking unavailable</strong>
            <p>{benchmarkError}</p>
          </div>
        ) : benchmarkProjects.length === 0 ? (
          <div className="benchmark-message">
            <span className="benchmark-info-icon">i</span>
            <div>
              <strong>No comparable projects available</strong>
              <p>No other project with a matching domain and available snapshot data was found.</p>
            </div>
          </div>
        ) : (
          <div className="benchmark-list">
            {benchmarkProjects.map((benchmark) => {
              const originalCost =
                benchmark.snapshot.originalCostCr ??
                benchmark.project.originalCostCr ??
                null;
              const revisedCost = benchmark.snapshot.revisedCostCr ?? null;

              return (
                <div
                  key={benchmark.project.projectId}
                  className="benchmark-card"
                >
                  <div className="benchmark-card-header">
                    <div className="benchmark-project-info">
                      <span className="benchmark-project-id">
                        Project ID: {benchmark.project.projectId}
                      </span>
                      <h3>{benchmark.project.projectName}</h3>
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
                      <span>Original Cost</span>
                      <strong>
                        {originalCost !== null
                          ? `₹ ${originalCost.toFixed(2)} Cr`
                          : "No Data"}
                      </strong>
                    </div>

                    <div className="benchmark-metric">
                      <span>Revised Cost</span>
                      <strong>
                        {revisedCost !== null
                          ? `₹ ${revisedCost.toFixed(2)} Cr`
                          : "No Data"}
                      </strong>
                    </div>

                    <div className="benchmark-metric">
                      <span>Physical Progress</span>
                      <strong>
                        {typeof benchmark.snapshot.physicalProgressPct === "number"
                          ? `${benchmark.snapshot.physicalProgressPct.toFixed(1)}%`
                          : "No Data"}
                      </strong>
                    </div>

                    <div className="benchmark-metric">
                      <span>Financial Progress</span>
                      <strong>
                        {benchmark.financialProgressPct !== null
                          ? `${benchmark.financialProgressPct.toFixed(1)}%`
                          : "No Data"}
                      </strong>
                    </div>

                    <div className="benchmark-metric">
                      <span>Cost Variance</span>
                      <strong
                        className={
                          benchmark.costVariancePct !== null &&
                          benchmark.costVariancePct > 0
                            ? "benchmark-negative"
                            : "benchmark-positive"
                        }
                      >
                        {benchmark.costVariancePct !== null
                          ? `${
                              benchmark.costVariancePct >= 0 ? "+" : ""
                            }${benchmark.costVariancePct.toFixed(1)}%`
                          : "No Data"}
                      </strong>
                    </div>

                    <div className="benchmark-metric">
                      <span>Schedule Status</span>
                      <strong
                        className={
                          benchmark.scheduleStatus === "Within Target"
                            ? "benchmark-positive"
                            : benchmark.scheduleStatus === "Delayed / Past Target"
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
            })}
          </div>
        )}

        {benchmarkStats && (
          <div className="benchmark-insight">
            <div className="benchmark-insight-header">
              <div>
                <span className="benchmark-insight-label">Decision Insight</span>
                <h3>Benchmark Summary</h3>
              </div>
            </div>

            <p className="benchmark-insight-description">
              This comparison summarizes the available benchmark projects from the same domain. It provides context for interpreting the current project's execution and cost indicators.
            </p>

            <div className="benchmark-insight-metrics">
              <div className="benchmark-insight-metric">
                <span>Similar Projects Analysed</span>
                <strong>{benchmarkStats.projectCount}</strong>
              </div>

              <div className="benchmark-insight-metric">
                <span>Average Physical Progress</span>
                <strong>
                  {benchmarkStats.averageProgress !== null
                    ? `${benchmarkStats.averageProgress.toFixed(1)}%`
                    : "—"}
                </strong>
              </div>

              <div className="benchmark-insight-metric">
                <span>Average Cost Escalation</span>
                <strong>
                  {benchmarkStats.averageCostEscalation !== null
                    ? `${benchmarkStats.averageCostEscalation.toFixed(1)}%`
                    : "—"}
                </strong>
              </div>
            </div>
          </div>
        )}

        {benchmarkComparison && (
          <div className="benchmark-comparison">
            <div className="benchmark-comparison-header">
              <div>
                <span className="benchmark-insight-label">Project vs Peer Context</span>
                <h3>Current Project Comparison</h3>
              </div>
            </div>

            <div className="benchmark-comparison-grid">
              <div className="benchmark-comparison-card">
                <span>Physical Progress</span>
                <div className="benchmark-comparison-values">
                  <div>
                    <small>Current Project</small>
                    <strong>
                      {benchmarkComparison.currentProgress !== null &&
                      benchmarkComparison.currentProgress !== undefined
                        ? `${benchmarkComparison.currentProgress.toFixed(1)}%`
                        : "—"}
                    </strong>
                  </div>
                  <div>
                    <small>Peer Average</small>
                    <strong>
                      {benchmarkStats?.averageProgress !== null &&
                      benchmarkStats?.averageProgress !== undefined
                        ? `${benchmarkStats.averageProgress.toFixed(1)}%`
                        : "—"}
                    </strong>
                  </div>
                </div>
                <div className="benchmark-comparison-difference">
                  Difference:{" "}
                  {benchmarkComparison.progressDifference !== null
                    ? `${
                        benchmarkComparison.progressDifference >= 0 ? "+" : ""
                      }${benchmarkComparison.progressDifference.toFixed(1)}%`
                    : "—"}
                </div>
              </div>

              <div className="benchmark-comparison-card">
                <span>Cost Escalation</span>
                <div className="benchmark-comparison-values">
                  <div>
                    <small>Current Project</small>
                    <strong>
                      {benchmarkComparison.currentCostEscalation !== null
                        ? `${benchmarkComparison.currentCostEscalation.toFixed(1)}%`
                        : "—"}
                    </strong>
                  </div>
                  <div>
                    <small>Peer Average</small>
                    <strong>
                      {benchmarkStats?.averageCostEscalation !== null &&
                      benchmarkStats?.averageCostEscalation !== undefined
                        ? `${benchmarkStats.averageCostEscalation.toFixed(1)}%`
                        : "—"}
                    </strong>
                  </div>
                </div>
                <div className="benchmark-comparison-difference">
                  Difference:{" "}
                  {benchmarkComparison.costDifference !== null
                    ? `${
                        benchmarkComparison.costDifference >= 0 ? "+" : ""
                      }${benchmarkComparison.costDifference.toFixed(1)}%`
                    : "—"}
                </div>
              </div>
            </div>
          </div>
        )}

        {benchmarkContext && (
  <div className="benchmark-context">

    <div className="benchmark-context-header">
      <span className="benchmark-insight-label">
        Comparison Context
      </span>

      <h3>
        What the peer comparison indicates
      </h3>
    </div>

    <div className="benchmark-context-grid">

      <div className="benchmark-context-card">
        <span>Physical Progress</span>

        <p>
          {benchmarkContext.progressContext}
        </p>
      </div>

      <div className="benchmark-context-card">
        <span>Cost Escalation</span>

        <p>
          {benchmarkContext.costContext}
        </p>
      </div>

    </div>

  </div>
)}
      </section>

      {/* =====================================
          COST ESCALATION DRIVER ANALYSIS
      ====================================== */}
      <section className="details-card cost-analysis-section">
        <div className="cost-analysis-header">
          <div>
            <h2>Cost Escalation Driver Analysis</h2>
            <p>Project factors associated with cost and execution pressure based on available data.</p>
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
            <span className="cost-analysis-info">i</span>
            <div>
              <strong>Cost driver analysis unavailable</strong>
              <p>Additional cost or execution data is required for this analysis.</p>
            </div>
          </div>
        ) : (
          <div className="cost-driver-list">
            {costDrivers.map((driver, index) => (
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
                    <strong>{driver.title}</strong>
                    <div className="cost-driver-meta">
                      <span className="cost-driver-value">{driver.value}</span>
                      <span className={`cost-driver-impact ${driver.impact}`}>
                        {driver.impact === "high"
                          ? "High"
                          : driver.impact === "medium"
                          ? "Medium"
                          : "Low"}
                      </span>
                    </div>
                  </div>
                  <p>{driver.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* =====================================
          DATA QUALITY & DECISION TRUST
      ====================================== */}
      <section className="details-card data-quality-section">
        <div className="data-quality-header">
          <div>
            <h2>Data Quality & Decision Trust</h2>
            <p>Source context and limitations that should be considered before using project indicators for official decisions.</p>
          </div>
          <div className="data-quality-badge">Source Context</div>
        </div>

        <div className="data-quality-grid">
          <div className="data-quality-item">
            <span>Primary Data Source</span>
            <strong>{project.dataSource || "Not available"}</strong>
          </div>
          <div className="data-quality-item">
            <span>Source Project Code</span>
            <strong>{project.sourceProjectCode ?? "Not available"}</strong>
          </div>
          <div className="data-quality-item full-width">
            <span>Execution Indicator Note</span>
           <p>
  The canonical PAIMANA dataset used by NeevAI provides the core project
  monitoring fields used for prediction and risk analysis. Additional
  indicators such as land acquisition, statutory clearances, contractor
  history, geological or site-condition factors, weather and litigation
  signals are not currently verified as fields in the canonical dataset.
  Any such supplementary values shown in the prototype must therefore be
  treated as unverified project inputs and not as official PAIMANA values.
</p>
          </div>
        </div>
      </section>


            {/* =====================================
          PROJECT INTELLIGENCE Q&A
      ====================================== */}
      <section className="details-card project-intelligence-section">
        <div className="project-intelligence-header">
          <div>
            <h2>Project Intelligence Assistant</h2>
            <p>
              Ask a project-monitoring question using the current project
              snapshot and model predictions.
            </p>
          </div>

          <div className="project-intelligence-badge">
            Grounded AI
          </div>
        </div>

        <div className="project-intelligence-prompts">
          {[
            "Why is this project at risk?",
            "What delay is currently predicted?",
            "What is the expected cost overrun?",
            "What should be reviewed?",
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="project-intelligence-prompt"
              onClick={() => {
                setIntelligenceQuery(prompt);
              }}
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="project-intelligence-input-row">
          <input
            type="text"
            value={intelligenceQuery}
            onChange={(event) =>
              setIntelligenceQuery(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleAskProjectIntelligence();
              }
            }}
            placeholder="Ask about risk, delay, cost, progress, or actions..."
            maxLength={500}
            disabled={intelligenceLoading}
          />

          <button
            type="button"
            className="project-intelligence-ask-button"
            onClick={handleAskProjectIntelligence}
            disabled={
              intelligenceLoading ||
              !intelligenceQuery.trim()
            }
          >
            {intelligenceLoading
              ? "Analyzing..."
              : "Ask"}
          </button>
        </div>

        {intelligenceError && (
          <div className="project-intelligence-error">
            {intelligenceError}
          </div>
        )}

        {intelligenceResponse && (
          <div className="project-intelligence-response">
            <div className="project-intelligence-response-label">
              Project Intelligence
            </div>

            <p>
              {intelligenceResponse.answer}
            </p>

            {intelligenceResponse.prediction && (
              <div className="project-intelligence-prediction">
                <div>
                  <span>Risk Score</span>
                  <strong>
                    {typeof intelligenceResponse.prediction
                      .predicted_risk_score === "number"
                      ? intelligenceResponse.prediction
                          .predicted_risk_score.toFixed(1)
                      : "—"}
                    /100
                  </strong>
                </div>

                <div>
                  <span>Predicted Delay</span>
                  <strong>
                    {typeof intelligenceResponse.prediction
                      .predicted_delay_months === "number"
                      ? `${intelligenceResponse.prediction.predicted_delay_months.toFixed(
                          1
                        )} months`
                      : "—"}
                  </strong>
                </div>

                <div>
                  <span>Cost Overrun</span>
                  <strong>
                    {typeof intelligenceResponse.prediction
                      .predicted_cost_overrun_pct === "number"
                      ? `${intelligenceResponse.prediction.predicted_cost_overrun_pct.toFixed(
                          2
                        )}%`
                      : "—"}
                  </strong>
                </div>
              </div>
            )}
          </div>
        )}
      </section>


      {/* =====================================
          RISK METHODOLOGY
      ====================================== */}
      <section className="details-card risk-methodology-section">
        <div className="risk-methodology-header">
          <div>
            <h2>Risk Score Methodology</h2>
            <p>The project risk score is a weighted indicator built from execution and financial signals.</p>
          </div>
          <div className="risk-methodology-badge">Explainable Risk Model</div>
        </div>

        <div className="risk-methodology-grid">
          <div className="risk-methodology-item"><strong>30%</strong><span>Cost Risk</span><p>Cost variance between financial and physical progress.</p></div>
          <div className="risk-methodology-item"><strong>30%</strong><span>Schedule Risk</span><p>Variance between reported progress and expected schedule progress.</p></div>
          <div className="risk-methodology-item"><strong>20%</strong><span>Velocity Risk</span><p>Observed progress velocity compared with the planned execution rate.</p></div>
          <div className="risk-methodology-item"><strong>20%</strong><span>Efficiency Risk</span><p>Execution efficiency pressure derived from cost-versus-progress variance.</p></div>
        </div>

        <div className="risk-methodology-note"><strong>Interpretation:</strong> the score is a decision-support signal, not a final administrative decision. Higher values indicate greater execution pressure and should trigger review of the underlying project indicators.</div>
      </section>

      {/* =====================================
          RECOMMENDED ACTIONS
      ====================================== */}
      <section className="details-card recommendations-section">
        <div className="recommendations-header">
          <div>
            <h2>Recommended Actions</h2>
            <p>Suggested actions based on detected project risks, execution factors and AI predictions.</p>
          </div>
          <div className="recommendation-count">
            {recommendations.length}{" "}
            {recommendations.length === 1 ? "Action" : "Actions"}
          </div>
        </div>

        {recommendations.length === 0 ? (
          <div className="recommendations-empty">
            <span className="recommendation-check">✓</span>
            <div>
              <strong>No immediate actions identified</strong>
              <p>No significant actionable risk indicators were detected from the available data.</p>
            </div>
          </div>
        ) : (
          <div className="recommendation-list">
            {recommendations.map((recommendation, index) => (
              <div
                key={`${recommendation.title}-${index}`}
                className={`recommendation-item ${recommendation.priority}`}
              >
                <div className="recommendation-number">{index + 1}</div>

                <div className="recommendation-content">
                  <div className="recommendation-title-row">
                    <strong>{recommendation.title}</strong>
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
                  <p>{recommendation.reason}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default ProjectDetails;