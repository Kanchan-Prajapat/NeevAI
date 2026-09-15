export const RISK_LEVELS = [
  "Low",
  "Medium",
  "High",
  "Critical",
] as const;

export type RiskLevel =
  (typeof RISK_LEVELS)[number];