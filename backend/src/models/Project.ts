import { Schema, model, Document } from "mongoose";
import { ProjectStatus, Sector, ProjectTypes, ProjectType } from "../constants";

export interface IProject extends Document {
  projectCode: string;
  name: string;
  sector: Sector;
  type: ProjectType;
  status: ProjectStatus;
  startDate: Date;
  endDate?: Date;
  budget: number; // USD
  description?: string;
  source?: string;
}

const ProjectSchema = new Schema<IProject>(
  {
    projectCode: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String, required: true },
    sector: { type: String, enum: Object.values(Sector), required: true },
    type: { type: String, enum: ProjectTypes, required: true },
    status: { type: String, enum: Object.values(ProjectStatus), default: ProjectStatus.Planned },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    budget: { type: Number, required: true, min: 0 },
    description: { type: String },
    source: { type: String },
  },
  { timestamps: true }
);

export const Project = model<IProject>('Project', ProjectSchema);

