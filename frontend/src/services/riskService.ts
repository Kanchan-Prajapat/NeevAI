import type { Project, ProjectSnapshot } from "../../../shared/types";

import { RISK_WEIGHTS } from "../../../shared/constants/riskWeights";
import { HEALTH_THRESHOLDS } from "../../../shared/constants/healthThresholds";
import { DERIVED_METRIC_FORMULAS } from "../../../shared/constants/derivedMetricFormulas";

import { clamp } from "../../../shared/utils/clamp";
import { toDate, daysBetween } from "../../../shared/utils/dateUtils";

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

export interface RiskCalculationResult {
  financialProgress: number;
  physicalProgress: number;
  costVariance: number;

  expectedVelocity: number;
  actualVelocity: number;
  scheduleVariance: number;

  riskComponents: RiskComponents;
  overallRiskScore: number;
  riskLevel: RiskLevel;
}

/* -------------------- Helpers -------------------- */

const round = (
  value: number,
  decimals = 2
): number => {
  const factor = Math.pow(10, decimals);

  return (
    Math.round(value * factor) / factor
  );
};

const getRiskLevel = (
  score: number
): RiskLevel => {
  if (
    score <= HEALTH_THRESHOLDS.LOW_MAX
  ) {
    return "Low";
  }

  if (
    score <= HEALTH_THRESHOLDS.MEDIUM_MAX
  ) {
    return "Medium";
  }

  if (
    score <= HEALTH_THRESHOLDS.HIGH_MAX
  ) {
    return "High";
  }

  return "Critical";
};

/* -------------------- Main Calculation -------------------- */

export const calculateProjectRisk = (
  project: Project,
  latestSnapshot: ProjectSnapshot,
  previousSnapshot?: ProjectSnapshot
): RiskCalculationResult => {

  /*
   * --------------------------------------------------
   * 1. PROJECT COST
   * --------------------------------------------------
   */

  const projectCost =
    latestSnapshot.revisedCostCr ??
    project.originalCostCr ??
    0;

  const expenditure =
    latestSnapshot.cumulativeExpenditureCr ??
    0;

  /*
   * --------------------------------------------------
   * 2. FINANCIAL PROGRESS
   * --------------------------------------------------
   */

  const financialProgress =
    DERIVED_METRIC_FORMULAS.FINANCIAL_PROGRESS.calculate(
      expenditure,
      projectCost
    );

  /*
   * --------------------------------------------------
   * 3. PHYSICAL PROGRESS
   * --------------------------------------------------
   */

  const physicalProgress =
    clamp(
      latestSnapshot.physicalProgressPct ?? 0
    );

  /*
   * --------------------------------------------------
   * 4. COST VARIANCE
   * --------------------------------------------------
   */

  const costVariance =
    DERIVED_METRIC_FORMULAS.COST_VARIANCE.calculate(
      financialProgress,
      physicalProgress
    );

  /*
   * --------------------------------------------------
   * 5. PROJECT DATES
   * --------------------------------------------------
   */

  const projectStart =
    toDate(project.approvalDate);

  const projectEnd =
    toDate(
      latestSnapshot.revisedCompletionDate ??
        latestSnapshot.anticipatedCompletionDate ??
        latestSnapshot.originalCompletionDate ??
        project.originalCompletionDate
    );

  const snapshotDate =
    toDate(latestSnapshot.reportDate);

  /*
   * --------------------------------------------------
   * 6. PLANNED DAYS
   * --------------------------------------------------
   */

  const plannedDays =
    daysBetween(
      projectStart,
      projectEnd
    );

  /*
   * --------------------------------------------------
   * 7. EXPECTED PROGRESS
   * --------------------------------------------------
   */

  let expectedProgress = 0;

  if (
    projectStart &&
    snapshotDate &&
    plannedDays > 0
  ) {
    const elapsedDays =
      daysBetween(
        projectStart,
        snapshotDate
      );

    expectedProgress =
      clamp(
        DERIVED_METRIC_FORMULAS.EXPECTED_PROGRESS.calculate(
          elapsedDays,
          plannedDays
        )
      );
  }

  /*
   * --------------------------------------------------
   * 8. SCHEDULE VARIANCE
   * --------------------------------------------------
   */

  const scheduleVariance =
    DERIVED_METRIC_FORMULAS.SCHEDULE_VARIANCE.calculate(
      physicalProgress,
      expectedProgress
    );

  /*
   * --------------------------------------------------
   * 9. EXPECTED VELOCITY
   * --------------------------------------------------
   */

  const expectedVelocity =
    DERIVED_METRIC_FORMULAS.EXPECTED_VELOCITY.calculate(
      plannedDays
    );

  /*
   * --------------------------------------------------
   * 10. ACTUAL VELOCITY
   * --------------------------------------------------
   */

  let actualVelocity = 0;

  if (
    previousSnapshot &&
    snapshotDate
  ) {
    const previousDate =
      toDate(
        previousSnapshot.reportDate
      );

    const previousProgress =
      previousSnapshot.physicalProgressPct ??
      0;

    const intervalDays =
      daysBetween(
        previousDate,
        snapshotDate
      );

    if (intervalDays > 0) {
      actualVelocity =
        DERIVED_METRIC_FORMULAS.ACTUAL_VELOCITY.calculate(
          physicalProgress,
          previousProgress,
          intervalDays
        );
    }
  } else if (
    projectStart &&
    snapshotDate
  ) {
    const elapsedDays =
      daysBetween(
        projectStart,
        snapshotDate
      );

    if (elapsedDays > 0) {
      actualVelocity =
        physicalProgress / elapsedDays;
    }
  }

  /*
   * --------------------------------------------------
   * 11. RISK COMPONENTS
   * --------------------------------------------------
   */

  const costRisk =
    clamp(costVariance * 2);

  const scheduleRisk =
    clamp(-scheduleVariance * 2);

  let velocityRisk = 0;

  if (expectedVelocity > 0) {
    velocityRisk =
      clamp(
        (
          (expectedVelocity - actualVelocity) /
          expectedVelocity
        ) * 100
      );
  }

  const efficiencyRisk =
    clamp(costVariance * 2);

  const riskComponents: RiskComponents = {
    costRisk: round(costRisk),
    scheduleRisk: round(scheduleRisk),
    velocityRisk: round(velocityRisk),
    efficiencyRisk: round(efficiencyRisk),
  };

  /*
   * --------------------------------------------------
   * 12. OVERALL RISK SCORE
   * --------------------------------------------------
   */

  const overallRiskScore =
    costRisk * RISK_WEIGHTS.cost +
    scheduleRisk * RISK_WEIGHTS.schedule +
    velocityRisk * RISK_WEIGHTS.velocity +
    efficiencyRisk * RISK_WEIGHTS.efficiency;

  const finalScore =
    round(
      clamp(overallRiskScore)
    );

  /*
   * --------------------------------------------------
   * 13. FINAL RESULT
   * --------------------------------------------------
   */

  return {
    financialProgress: round(
      clamp(financialProgress)
    ),

    physicalProgress: round(
      physicalProgress
    ),

    costVariance: round(
      costVariance
    ),

    expectedVelocity: round(
      expectedVelocity,
      4
    ),

    actualVelocity: round(
      actualVelocity,
      4
    ),

    scheduleVariance: round(
      scheduleVariance
    ),

    riskComponents,

    overallRiskScore: finalScore,

    riskLevel:
      getRiskLevel(finalScore),
  };
};