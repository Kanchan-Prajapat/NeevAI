import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "../firebase/firebase";

import type { Prediction } from "../../../shared/types";

import type {
  PredictionType,
} from "../../../shared/constants";

const COLLECTION_NAME = "predictions";


export const createPrediction = async (
  prediction: Omit<
    Prediction,
    "id" | "createdAt" | "updatedAt"
  >
): Promise<string> => {
  const docRef = await addDoc(
    collection(db, COLLECTION_NAME),
    {
      ...prediction,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );

  return docRef.id;
};


export const getPredictionById = async (
  id: string
): Promise<Prediction | null> => {
  const predictionRef = doc(
    db,
    COLLECTION_NAME,
    id
  );

  const predictionDoc = await getDoc(predictionRef);

  if (!predictionDoc.exists()) {
    return null;
  }

  return {
    id: predictionDoc.id,
    ...predictionDoc.data(),
  } as Prediction;
};


export const getPredictionsByProjectId = async (
  projectId: string
): Promise<Prediction[]> => {
  const predictionQuery = query(
    collection(db, COLLECTION_NAME),
    where("projectId", "==", projectId),
    orderBy("createdAt", "desc")
  );

  const querySnapshot = await getDocs(predictionQuery);

  return querySnapshot.docs.map(
    (document) =>
      ({
        id: document.id,
        ...document.data(),
      }) as Prediction
  );
};


export const getLatestPrediction = async (
  projectId: string,
  predictionType: PredictionType
): Promise<Prediction | null> => {
  const predictionQuery = query(
    collection(db, COLLECTION_NAME),
    where("projectId", "==", projectId),
    where("predictionType", "==", predictionType),
    orderBy("createdAt", "desc"),
    limit(1)
  );

  const querySnapshot = await getDocs(predictionQuery);

  if (querySnapshot.empty) {
    return null;
  }

  const predictionDoc = querySnapshot.docs[0];

  return {
    id: predictionDoc.id,
    ...predictionDoc.data(),
  } as Prediction;
};


export const updatePrediction = async (
  id: string,
  data: Partial<Prediction>
): Promise<void> => {
  const predictionRef = doc(
    db,
    COLLECTION_NAME,
    id
  );

  await updateDoc(predictionRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};


export const deletePrediction = async (
  id: string
): Promise<void> => {
  const predictionRef = doc(
    db,
    COLLECTION_NAME,
    id
  );

  await deleteDoc(predictionRef);
};


// ---------------------------------------------------------
// FastAPI ML Prediction
// ---------------------------------------------------------

export interface MLProjectPrediction {
  predicted_delay_months: number;
  predicted_cost_overrun_pct: number;
  predicted_cost_overrun_cr: number;
  predicted_risk_score: number;
  risk_category: string;
  model_version: string;

  feature_count: number;
}

export interface MLProjectPredictionResponse {
  success: boolean;

  project: {
    projectId: string;
    projectName: string;
    domain: string;
    state?: string;
  };

  snapshot: {
    snapshotId: string;
    reportType: string;
    reportPeriod: string;
    reportDate: string;
  };

  prediction: MLProjectPrediction;
}


export interface TemporalProgressPrediction {
  predicted_next_month_physical_progress_pct: number;
  predicted_progress_change_pct: number;
  current_physical_progress_pct: number;
  model_version: string;
  feature_count: number;
  feature_columns: string[];
}

export interface TemporalProgressPredictionResponse {
  success: boolean;

  predictionType: string;

  project: {
    projectId: string;
    projectName: string;
    domain: string;
    state?: string;
  };

  snapshot: {
    snapshotId: string;
    reportType: string;
    reportPeriod: string;
    reportDate: string;
  };

  prediction: TemporalProgressPrediction;
}


const ML_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "http://127.0.0.1:8000";

export const getMLProjectPrediction = async (
  projectId: string
): Promise<MLProjectPredictionResponse> => {
  const cleanProjectId = projectId.trim();

  if (!cleanProjectId) {
    throw new Error("Project ID is required.");
  }

  const response = await fetch(
    `${ML_API_BASE_URL}/api/predictions/project/${encodeURIComponent(
      cleanProjectId
    )}`
  );

  let data: unknown;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `Prediction API returned an invalid response (${response.status}).`
    );
  }

  if (!response.ok) {
    const detail =
      typeof data === "object" &&
      data !== null &&
      "detail" in data &&
      typeof (data as { detail?: unknown }).detail === "string"
        ? (data as { detail: string }).detail
        : `Prediction failed with status ${response.status}.`;

    throw new Error(detail);
  }

console.log("ML API RESPONSE:", data);
  return data as MLProjectPredictionResponse;
};



export const getNextMonthProgressPrediction = async (
  projectId: string
): Promise<TemporalProgressPredictionResponse> => {
  const cleanProjectId = projectId.trim();

  if (!cleanProjectId) {
    throw new Error("Project ID is required.");
  }

  const response = await fetch(
    `${ML_API_BASE_URL}/api/predictions/project/${encodeURIComponent(
      cleanProjectId
    )}/next-month-progress`
  );

  let data: unknown;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `Temporal prediction API returned an invalid response (${response.status}).`
    );
  }

  if (!response.ok) {
    const detail =
      typeof data === "object" &&
      data !== null &&
      "detail" in data &&
      typeof (data as { detail?: unknown }).detail === "string"
        ? (data as { detail: string }).detail
        : `Temporal prediction failed with status ${response.status}.`;

    throw new Error(detail);
  }

  console.log(
    "TEMPORAL PROGRESS API RESPONSE:",
    data
  );

  return data as TemporalProgressPredictionResponse;
};



// ---------------------------------------------------------
// FastAPI What-If Scenario Prediction
// ---------------------------------------------------------

export interface WhatIfScenario {
  originalCostCr?: number;
  cumulativeExpenditureCr?: number;
  physicalProgressPct?: number;

  totalMilestones?: number;
  completedMilestones?: number;
  delayedMilestones?: number;

  landAcquisitionDelayMonths?: number;
  clearanceDelayMonths?: number;

  contractorDelayScore?: number;
  geologicalDelayScore?: number;
}

export interface MLScenarioPredictionResponse {
  success: boolean;
  simulation: boolean;

  project: {
    projectId: string;
    projectName: string;
    domain: string;
    state?: string;
  };

  snapshot: {
    snapshotId: string;
    reportType: string;
    reportPeriod: string;
    reportDate: string;
  };

  prediction: MLProjectPrediction;

  overrides: WhatIfScenario;
}

export const runWhatIfPrediction = async (
  projectId: string,
  scenario: WhatIfScenario
): Promise<MLScenarioPredictionResponse> => {

  const cleanProjectId = projectId.trim();

  if (!cleanProjectId) {
    throw new Error("Project ID is required.");
  }

  const response = await fetch(
    `${ML_API_BASE_URL}/api/predictions/simulate?project_id=${encodeURIComponent(
      cleanProjectId
    )}`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(scenario),
    }
  );

  let data: unknown;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `What-if API returned an invalid response (${response.status}).`
    );
  }

  if (!response.ok) {

    const detail =
      typeof data === "object" &&
      data !== null &&
      "detail" in data &&
      typeof (data as { detail?: unknown }).detail === "string"
        ? (data as { detail: string }).detail
        : `What-if prediction failed with status ${response.status}.`;

    throw new Error(detail);
  }

  console.log(
    "WHAT-IF ML API RESPONSE:",
    data
  );

  return data as MLScenarioPredictionResponse;
};