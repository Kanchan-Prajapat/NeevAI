// src/config/riskConfig.ts
export const riskWeights = {
  scheduleDelay: 0.40,
  costOverrun: 0.30,
  progressVelocity: 0.20,
  costEfficiency: 0.10,
} as const;

// Risk score thresholds (0‑100 scale)
export const riskThresholds = {
  low: 29, // 0‑29 → Low
  medium: 59, // 30‑59 → Medium
  high: 79, // 60‑79 → High
  critical: 100, // 80‑100 → Critical
} as const;
