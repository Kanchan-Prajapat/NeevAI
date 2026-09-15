  export const SECTORS = [
  "Infrastructure",
  "Transportation",
  "Healthcare",
  "Education",
  "Energy",
  "Water & Sanitation",
  "Urban Development",
  "Other",
] as const;

export type Sectors =
  (typeof SECTORS)[number];