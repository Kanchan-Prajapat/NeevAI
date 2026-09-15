export const PROJECT_STATUSES = [
  "Planned",
  "Ongoing",
  "Delayed",
  "Completed",
  "Stalled",
] as const;

export type ProjectStatus =
  (typeof PROJECT_STATUSES)[number];