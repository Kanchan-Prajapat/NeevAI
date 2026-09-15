export const PREDICTION_TYPES = {
  PROJECT_DELAY: "project_delay",
  COST_OVERRUN: "cost_overrun",
  PROJECT_RISK: "project_risk",
  COMPLETION_FORECAST: "completion_forecast",
  PERFORMANCE_ANALYSIS: "performance_analysis",
} as const;

export type PredictionType =
  typeof PREDICTION_TYPES[keyof typeof PREDICTION_TYPES];