export const DATA_STATUSES = [
  "complete",
  "partial",
  "insufficient_data",
] as const;

export type DataStatus =
  (typeof DATA_STATUSES)[number];