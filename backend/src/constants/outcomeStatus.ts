export const OutcomeStatuses = [
  "Completed",
  "Delayed Completion",
  "Failed",
  "Cancelled",
  "Stalled",
] as const;
export type OutcomeStatus = typeof OutcomeStatuses[number];
