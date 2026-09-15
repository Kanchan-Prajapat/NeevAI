export const ProjectTypes = [
  "Highway",
  "Expressway",
  "Road",
  "Bridge",
  "Hospital",
  "Medical College",
  "Healthcare Infrastructure",
] as const;
export type ProjectType = typeof ProjectTypes[number];
