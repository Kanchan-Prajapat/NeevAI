import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../firebase/firebase";

import type { Project } from "../../../shared/types";

const PROJECTS_COLLECTION = "projects";

/**
 * Create a new project
 */
export const createProject = async (
  project: Omit<Project, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  const docRef = await addDoc(
    collection(db, PROJECTS_COLLECTION),
    {
      ...project,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );

  return docRef.id;
};

/**
 * Get all projects
 */
export const getProjects = async (): Promise<Project[]> => {
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "http://127.0.0.1:8000";

  const response = await fetch(
    `${API_BASE_URL}/api/projects`
  );

  let data: unknown;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `Projects API returned an invalid response (${response.status}).`
    );
  }

  if (!response.ok) {
    const detail =
      typeof data === "object" &&
      data !== null &&
      "detail" in data &&
      typeof (data as { detail?: unknown }).detail === "string"
        ? (data as { detail: string }).detail
        : `Projects API failed with status ${response.status}.`;

    throw new Error(detail);
  }

  if (
    typeof data !== "object" ||
    data === null ||
    !("success" in data) ||
    (data as { success?: unknown }).success !== true
  ) {
    throw new Error(
      "Projects API returned an unsuccessful response."
    );
  }

  const projects =
    "projects" in data &&
    Array.isArray(
      (data as { projects?: unknown }).projects
    )
      ? ((data as {
          projects: Project[];
        }).projects ?? [])
      : [];

  return projects;
};
/**
 * Get project using Firestore document ID
 */
export const getProjectById = async (
  id: string
): Promise<Project | null> => {
  const documentRef = doc(
    db,
    PROJECTS_COLLECTION,
    id
  );

  const snapshot = await getDoc(documentRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as Project;
};

/**
 * Get project using official project ID
 */
export const getProjectByProjectId = async (
  projectId: string
): Promise<Project | null> => {
  const projects = await getProjects();

  return (
    projects.find(
      (project) => project.projectId === projectId
    ) || null
  );
};

/**
 * Update a project
 */
export const updateProject = async (
  id: string,
  projectData: Partial<Project>
): Promise<void> => {
  try {
    const projectRef = doc(
      db,
      PROJECTS_COLLECTION,
      id
    );

    // Firestore does not accept undefined values.
    const cleanedData = Object.fromEntries(
      Object.entries(projectData).filter(
        ([, value]) => value !== undefined
      )
    );

    await updateDoc(projectRef, {
      ...cleanedData,
      updatedAt: serverTimestamp(),
    });

  } catch (error) {
    console.error(
      "Failed to update project:",
      error
    );

    throw error;
  }
};


/**
 * Delete a project
 */
export const deleteProject = async (
  id: string
): Promise<void> => {
  const documentRef = doc(
    db,
    PROJECTS_COLLECTION,
    id
  );

  await deleteDoc(documentRef);
};


