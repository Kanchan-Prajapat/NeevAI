export const ANALYTICS_STATUSES = [
  "not_calculated",
  "calculated",
  "failed",
] as const;

export type AnalyticsStatus =
  (typeof ANALYTICS_STATUSES)[number];