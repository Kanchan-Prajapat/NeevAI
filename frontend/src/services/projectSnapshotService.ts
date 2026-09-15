import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "../firebase/firebase";

import type {
  ProjectSnapshot,
} from "../../../shared/types";

const SNAPSHOTS_COLLECTION = "projectSnapshots";

/**
 * Create a new project snapshot
 */
export const createProjectSnapshot = async (
  snapshot: Omit<
    ProjectSnapshot,
    "id" | "createdAt" | "updatedAt"
  >
): Promise<string> => {
  const docRef = await addDoc(
    collection(db, SNAPSHOTS_COLLECTION),
    {
      ...snapshot,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );

  return docRef.id;
};

/**
 * Get all snapshots for a project
 */
export const getProjectSnapshots = async (
  projectId: string
): Promise<ProjectSnapshot[]> => {
  const snapshotsQuery = query(
    collection(db, SNAPSHOTS_COLLECTION),
    where("projectId", "==", projectId)
  );

  const snapshot = await getDocs(snapshotsQuery);

  const snapshots = snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  })) as ProjectSnapshot[];

  return snapshots.sort((a, b) => {
    const dateA = new Date(
      a.reportDate as string
    ).getTime();

    const dateB = new Date(
      b.reportDate as string
    ).getTime();

    return dateB - dateA;
  });
};

/**
 * Get latest snapshot of a project
 */
export const getLatestProjectSnapshot = async (
  projectId: string
): Promise<ProjectSnapshot | null> => {
  const snapshots =
    await getProjectSnapshots(projectId);

  if (snapshots.length === 0) {
    return null;
  }

  return snapshots[0];
};

/**
 * Update a snapshot
 */
export const updateProjectSnapshot = async (
  id: string,
  updates: Partial<ProjectSnapshot>
): Promise<void> => {
  const documentRef = doc(
    db,
    SNAPSHOTS_COLLECTION,
    id
  );

  await updateDoc(documentRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Delete a snapshot
 */
export const deleteProjectSnapshot = async (
  id: string
): Promise<void> => {
  const documentRef = doc(
    db,
    SNAPSHOTS_COLLECTION,
    id
  );

  await deleteDoc(documentRef);
};



/**
 * Get all project snapshots
 */
export const getAllProjectSnapshots = async (): Promise<
  ProjectSnapshot[]
> => {
  const snapshotCollection = collection(
    db,
    SNAPSHOTS_COLLECTION
  );

  const snapshot = await getDocs(
    snapshotCollection
  );

  return snapshot.docs.map(
    (document) =>
      ({
        id: document.id,
        ...document.data(),
      }) as ProjectSnapshot
  );
};