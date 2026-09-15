import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
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
  const snapshot = await getDocs(
    collection(db, PROJECTS_COLLECTION)
  );

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  })) as Project[];
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
      "projects",
      id
    );

    await updateDoc(
      projectRef,
      projectData
    );

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


