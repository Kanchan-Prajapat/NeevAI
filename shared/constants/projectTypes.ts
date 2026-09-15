export const PROJECT_TYPES = {
  ROAD: "road",
  BUILDING: "building",
  BRIDGE: "bridge",
  WATER_SUPPLY: "water_supply",
  IRRIGATION: "irrigation",
  POWER: "power",
  TRANSPORT: "transport",
  HEALTHCARE: "healthcare",
  EDUCATION: "education",
  OTHER: "other",
} as const;

export type ProjectType =
  typeof PROJECT_TYPES[keyof typeof PROJECT_TYPES];