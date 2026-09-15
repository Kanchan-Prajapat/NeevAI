import { Schema, model, Document } from "mongoose";
import { RiskLevel, OutcomeStatuses } from "../constants";

export interface IProjectOutcome extends Document {
  project: Schema.Types.ObjectId;
  finalStatus: string; // e.g., "Completed", "Cancelled"
  finalCost: number;
  finalSchedule: Date;
  riskLevel: RiskLevel;
  summary?: string;
}

const ProjectOutcomeSchema = new Schema<IProjectOutcome>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    finalStatus: { type: String, enum: OutcomeStatuses, required: true },
    finalCost: { type: Number, min: 0, required: true },
    finalSchedule: { type: Date, required: true },
    riskLevel: { type: String, enum: Object.values(RiskLevel), required: true },
    summary: { type: String },
  },
  { timestamps: true }
);

export default model<IProjectOutcome>("ProjectOutcome", ProjectOutcomeSchema);
