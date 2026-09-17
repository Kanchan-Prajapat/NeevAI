import { Document, Schema, Types, model } from "mongoose";
import { RiskLevel } from "../constants";

export interface IDerivedMetric extends Document {
  project: Types.ObjectId;
  snapshot?: Types.ObjectId;

  financialProgress: number;
  physicalProgress: number;

  costVariance: number;

  expectedVelocity: number;
  actualVelocity: number;

  scheduleVariance: number;

  overallRiskScore: number;
  riskLevel: RiskLevel;

  computedAt: Date;
}

const DerivedMetricSchema = new Schema<IDerivedMetric>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    snapshot: {
      type: Schema.Types.ObjectId,
      ref: "ProjectSnapshot",
      required: false,
      index: true,
    },

    financialProgress: {
      type: Number,
      required: true,
    },

    physicalProgress: {
      type: Number,
      required: true,
    },

    costVariance: {
      type: Number,
      required: true,
    },

    expectedVelocity: {
      type: Number,
      required: true,
    },

    actualVelocity: {
      type: Number,
      required: true,
    },

    scheduleVariance: {
      type: Number,
      required: true,
    },

    overallRiskScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    riskLevel: {
      type: String,
      enum: Object.values(RiskLevel),
      required: true,
    },

    computedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

DerivedMetricSchema.index({
  project: 1,
  snapshot: 1,
});

export const DerivedMetric = model<IDerivedMetric>(
  "DerivedMetric",
  DerivedMetricSchema
);