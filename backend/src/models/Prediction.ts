import { Schema, model, Document } from "mongoose";

export interface IPrediction extends Document {
  project: Schema.Types.ObjectId;
  snapshot?: Schema.Types.ObjectId;
  modelName: string; // e.g., "delayPredictorV1"
  inputFeatures: Record<string, any>;
  prediction: number; // risk score 0-1
  predictedAt: Date;
}

const PredictionSchema = new Schema<IPrediction>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    snapshot: { type: Schema.Types.ObjectId, ref: "ProjectSnapshot", required: false },
    modelName: { type: String, required: true },
    inputFeatures: { type: Schema.Types.Mixed, required: true },
    prediction: { type: Number, min: 0, max: 1, required: true },
    predictedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default model<IPrediction>("Prediction", PredictionSchema);
