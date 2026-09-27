import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { recalculateProject } from "./recalcService";

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

  await recalculateProject(
    snapshot.projectId
  );

  return docRef.id;
};


/**
 * Get all snapshots for a project
 */
export const getProjectSnapshots = async (
  projectId: string
): Promise<ProjectSnapshot[]> => {
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "http://127.0.0.1:8000";

  const cleanProjectId = projectId.trim();

  if (!cleanProjectId) {
    throw new Error("Project ID is required.");
  }

  const response = await fetch(
    `${API_BASE_URL}/api/projects/${encodeURIComponent(
      cleanProjectId
    )}/snapshots`
  );

  let data: unknown;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `Snapshot API returned an invalid response (${response.status}).`
    );
  }

  if (!response.ok) {
    const detail =
      typeof data === "object" &&
      data !== null &&
      "detail" in data &&
      typeof (data as { detail?: unknown }).detail === "string"
        ? (data as { detail: string }).detail
        : `Snapshot API failed with status ${response.status}.`;

    throw new Error(detail);
  }

  if (
    typeof data !== "object" ||
    data === null ||
    !("success" in data) ||
    (data as { success?: unknown }).success !== true
  ) {
    throw new Error(
      "Snapshot API returned an unsuccessful response."
    );
  }

  const snapshots =
    "snapshots" in data &&
    Array.isArray(
      (data as { snapshots?: unknown }).snapshots
    )
      ? ((data as {
          snapshots: ProjectSnapshot[];
        }).snapshots ?? [])
      : [];

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

  const existingSnapshot =
    await getDoc(documentRef);

  if (!existingSnapshot.exists()) {
    throw new Error(
      `Snapshot not found: ${id}`
    );
  }

  const existingData =
    existingSnapshot.data() as ProjectSnapshot;

  await updateDoc(documentRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });

  const projectId =
    updates.projectId ??
    existingData.projectId;

  await recalculateProject(
    projectId
  );
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

  const existingSnapshot =
    await getDoc(documentRef);

  if (!existingSnapshot.exists()) {
    throw new Error(
      `Snapshot not found: ${id}`
    );
  }

  const snapshot =
    existingSnapshot.data() as ProjectSnapshot;

  await deleteDoc(documentRef);

  await recalculateProject(
    snapshot.projectId
  );
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