import { Document, Schema, Types, model } from "mongoose";

export type RecalcStatus =
  | "started"
  | "completed"
  | "failed";

export interface IRecalcLog extends Document {
  project: Types.ObjectId;

  status: RecalcStatus;

  startedAt: Date;
  endedAt?: Date;

  errorMessage?: string;

  computedAt?: Date;
}

const RecalcLogSchema = new Schema<IRecalcLog>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["started", "completed", "failed"],
      required: true,
    },

    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    endedAt: {
      type: Date,
    },

    errorMessage: {
      type: String,
    },

    computedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const RecalcLog = model<IRecalcLog>(
  "RecalcLog",
  RecalcLogSchema
);