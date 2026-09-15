import { Document, Schema, model } from 'mongoose';

export interface IImportLog extends Document {
  importType: 'project' | 'snapshot' | 'outcome';
  sourceFile: string;
  startedAt: Date;
  endedAt?: Date;
  totalRecords: number;
  validRecords: number;
  importedRecords: number;
  skippedRecords: number;
  failedRecords: number;
  status: 'completed' | 'partial' | 'failed';
  errorMessage?: string;
}

const ImportLogSchema = new Schema<IImportLog>(
  {
    importType: { type: String, required: true },
    sourceFile: { type: String, required: true },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    totalRecords: { type: Number, default: 0 },
    validRecords: { type: Number, default: 0 },
    importedRecords: { type: Number, default: 0 },
    skippedRecords: { type: Number, default: 0 },
    failedRecords: { type: Number, default: 0 },
    status: { type: String, enum: ['completed','partial','failed'], default: 'completed' },
    errorMessage: { type: String },
  },
  { timestamps: true }
);
export const ImportLog = model<IImportLog>('ImportLog', ImportLogSchema);
