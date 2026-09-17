export const DERIVED_METRIC_FORMULAS = {
  FINANCIAL_PROGRESS: {
    description:
      "Financial progress based on cumulative expenditure against project cost.",
    calculate: (
      expenditureCr: number,
      projectCostCr: number
    ): number => {
      if (projectCostCr <= 0) return 0;

      return (expenditureCr / projectCostCr) * 100;
    },
  },

  COST_VARIANCE: {
    description:
      "Difference between financial progress and physical progress.",
    calculate: (
      financialProgress: number,
      physicalProgress: number
    ): number => {
      return financialProgress - physicalProgress;
    },
  },

  EXPECTED_VELOCITY: {
    description:
      "Expected daily physical progress based on planned project duration.",
    calculate: (
      plannedDays: number
    ): number => {
      if (plannedDays <= 0) return 0;

      return 100 / plannedDays;
    },
  },

  ACTUAL_VELOCITY: {
    description:
      "Actual daily physical progress between reporting snapshots.",
    calculate: (
      currentProgress: number,
      previousProgress: number,
      intervalDays: number
    ): number => {
      if (intervalDays <= 0) return 0;

      return (
        (currentProgress - previousProgress) /
        intervalDays
      );
    },
  },

  SCHEDULE_VARIANCE: {
    description:
      "Difference between actual physical progress and expected progress.",
    calculate: (
      physicalProgress: number,
      expectedProgress: number
    ): number => {
      return physicalProgress - expectedProgress;
    },
  },

  EXPECTED_PROGRESS: {
    description:
      "Expected linear physical progress based on elapsed project duration.",
    calculate: (
      elapsedDays: number,
      plannedDays: number
    ): number => {
      if (plannedDays <= 0) return 0;

      return (
        (elapsedDays / plannedDays) * 100
      );
    },
  },
} as const;