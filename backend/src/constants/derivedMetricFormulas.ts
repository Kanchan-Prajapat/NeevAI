export const derivedMetricFormulas = {
  // financialProgress = (actualCost / budget) * 100
  financialProgress: (actualCost: number, budget: number): number => {
    if (budget === 0) return 0;
    return (actualCost / budget) * 100;
  },

  // costVariance = financialProgress - physicalProgress
  costVariance: (financialProgress: number, physicalProgress: number): number => {
    return financialProgress - physicalProgress;
  },

  // scheduleVariance = ((plannedCompletion - actualCompletion) / plannedDuration) * 100
  scheduleVariance: (
    plannedCompletion: Date,
    actualCompletion: Date,
    plannedDurationDays: number,
  ): number => {
    if (plannedDurationDays === 0) return 0;
    const diffMs = plannedCompletion.getTime() - actualCompletion.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return (diffDays / plannedDurationDays) * 100;
  },

  // expectedVelocity = 100 / totalPlannedProjectDays
  expectedVelocity: (totalPlannedDays: number): number => {
    if (totalPlannedDays === 0) return 0;
    return 100 / totalPlannedDays;
  },

  // actualVelocity based on two snapshots
  actualVelocity: (
    currentPhysicalProgress: number,
    previousPhysicalProgress: number,
    daysBetweenSnapshots: number,
  ): number => {
    if (daysBetweenSnapshots === 0) return 0;
    return (currentPhysicalProgress - previousPhysicalProgress) / daysBetweenSnapshots;
  },

  // costRisk for ongoing projects
  costRiskOngoing: (costVariance: number): number => {
    // clamp(costVariance * 2, 0, 100)
    const raw = costVariance * 2;
    return Math.max(0, Math.min(100, raw));
  },

  // costRisk for completed projects (costOverrun)
  costRiskCompleted: (finalCost: number, budget: number): number => {
    if (budget === 0) return 0;
    const overrun = ((finalCost - budget) / budget) * 100;
    return Math.max(0, Math.min(100, overrun));
  },

  // velocityRisk
  velocityRisk: (expected: number, actual: number): number => {
    if (expected === 0) return 0;
    const raw = ((expected - actual) / expected) * 100;
    return Math.max(0, Math.min(100, raw));
  },

  // efficiencyRisk handling per final specification
  efficiencyRisk: (
    financialProgress: number,
    physicalProgress: number,
  ): number | null => {
    if (financialProgress > 0) {
      const costEfficiency = physicalProgress / financialProgress;
      const raw = (1 - costEfficiency) * 100;
      return Math.max(0, Math.min(100, raw));
    }
    if (financialProgress === 0 && physicalProgress === 0) {
      return null; // unavailable
    }
    // financialProgress == 0 && physicalProgress > 0
    return 0;
  },
};
