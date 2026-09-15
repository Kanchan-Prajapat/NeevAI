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


