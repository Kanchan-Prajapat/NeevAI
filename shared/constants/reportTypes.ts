export const REPORT_TYPES = [
  "Monthly",
  "Quarterly",
  "Annual",
] as const;

export type ReportType =
  (typeof REPORT_TYPES)[number];