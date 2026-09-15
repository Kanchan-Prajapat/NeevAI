import { Schema, model, Document } from "mongoose";
import { ProjectStatus, ReportType } from "../constants";

export interface IProjectSnapshot extends Document {
  project: Schema.Types.ObjectId;
  snapshotDate: Date;
  reportType: string; // ReportType enum
  status: ProjectStatus;
  percentComplete: number; // 0-100
  actualCost: number; // >=0
  notes?: string;
}

const ProjectSnapshotSchema = new Schema<IProjectSnapshot>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    snapshotDate: { type: Date, required: true },
    reportType: { type: String, enum: Object.values(ReportType), required: true },
    status: { type: String, enum: Object.values(ProjectStatus), required: true },
    percentComplete: { type: Number, min: 0, max: 100, required: true },
    actualCost: { type: Number, min: 0, required: true },
    notes: { type: String },
  },
  { timestamps: true }
);

// Ensure only one snapshot per project per date
ProjectSnapshotSchema.index({ project: 1, snapshotDate: 1, reportType: 1 }, { unique: true });

export default model<IProjectSnapshot>("ProjectSnapshot", ProjectSnapshotSchema);
