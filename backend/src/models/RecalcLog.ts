import { Schema, model, Document } from 'mongoose';
import { Project } from './Project';

export interface RecalcLogDocument extends Document {
  project: import('mongoose').Types.ObjectId;
  // project reference as ObjectId – handled above
  status: 'started' | 'completed' | 'failed';
  startedAt: Date;
  endedAt?: Date;
  errorMessage?: string;
  computedAt?: Date; // when the recalculation succeeded
}

const RecalcLogSchema = new Schema<RecalcLogDocument>({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  status: { type: String, enum: ['started', 'completed', 'failed'], required: true },
  startedAt: { type: Date, default: Date.now, required: true },
  endedAt: { type: Date },
  errorMessage: { type: String },
  computedAt: { type: Date },
});

export const RecalcLog = model<RecalcLogDocument>('RecalcLog', RecalcLogSchema);
