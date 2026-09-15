import type { TimestampValue } from "./common";

import type {
  PredictionType,
  RiskLevel,
  DataStatus,
} from "../constants";

export interface Prediction {
  id?: string;

  // Related project
  projectId: string;

  // Prediction category
  predictionType: PredictionType;

  // Main prediction result
  predictedValue?: number;

  // Probability / confidence
  confidenceScore: number;

  // Risk classification
  riskLevel: RiskLevel;

  // Supporting information
  explanation?: string;

  // ML / analytics data availability
  dataStatus: DataStatus;

  // Optional prediction metadata
  modelVersion?: string;

  // Metadata
  createdAt?: TimestampValue;
  updatedAt?: TimestampValue;
}