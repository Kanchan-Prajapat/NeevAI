import { Schema, model, Document } from 'mongoose';
import { Project } from './Project';

export interface IDerivedMetric extends Document {
  project: import('mongoose').Types.ObjectId;
  snapshot?: Schema.Types.ObjectId;
  metricName: string;
  value: number;
  calculatedAt: Date;
  // New fields for Phase 4
  financialProgress?: number;
  physicalProgress?: number;
  costVariance?: number;
  expectedVelocity?: number;
  actualVelocity?: number;
  scheduleVariance?: number;
  overallRiskScore?: number;
  riskLevel?: string;
  computedAt?: Date;
}

const DerivedMetricSchema = new Schema<IDerivedMetric>(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    snapshot: { type: Schema.Types.ObjectId, ref: 'ProjectSnapshot' },
    metricName: { type: String, required: true },
    value: { type: Number, required: true },
    calculatedAt: { type: Date, default: Date.now },
    // Phase 4 fields (optional, stored when calculated)
    financialProgress: { type: Number },
    physicalProgress: { type: Number },
    costVariance: { type: Number },
    expectedVelocity: { type: Number },
    actualVelocity: { type: Number },
    scheduleVariance: { type: Number },
    overallRiskScore: { type: Number },
    riskLevel: { type: String },
    computedAt: { type: Date },
  },
  { timestamps: true }
);

export const DerivedMetric = model<IDerivedMetric>('DerivedMetric', DerivedMetricSchema);
