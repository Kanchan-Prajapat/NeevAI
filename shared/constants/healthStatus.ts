export const HEALTH_STATUSES = [
  "Good",
  "Moderate",
  "Poor",
] as const;

export type HealthStatus =
  (typeof HEALTH_STATUSES)[number];