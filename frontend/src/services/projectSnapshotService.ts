import type {
  ProjectSnapshot,
} from "../../../shared/types";

import {
  CACHE_KEYS,
  cachedFetch,
  invalidatePortfolioCache,
} from "./dataCache";


// ==================================================
// API BASE URL
// ==================================================

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";


// ==================================================
// API RESPONSE HELPER
// ==================================================

const parseApiResponse = async (
  response: Response,
  operation: string
): Promise<unknown> => {

  let data: unknown;

  try {
    data =
      await response.json();
  } catch {
    throw new Error(
      `${operation} returned an invalid response (${response.status}).`
    );
  }

  if (!response.ok) {

    const detail =
      typeof data === "object" &&
      data !== null &&
      "detail" in data &&
      typeof (
        data as {
          detail?: unknown;
        }
      ).detail === "string"
        ? (
            data as {
              detail: string;
            }
          ).detail
        : `${operation} failed with status ${response.status}.`;

    throw new Error(detail);
  }

  if (
    typeof data !== "object" ||
    data === null ||
    !("success" in data) ||
    (
      data as {
        success?: unknown;
      }
    ).success !== true
  ) {
    throw new Error(
      `${operation} returned an unsuccessful response.`
    );
  }

  return data;
};


// ==================================================
// CREATE PROJECT SNAPSHOT
// ==================================================

export const createProjectSnapshot =
  async (
    snapshot: Omit<
      ProjectSnapshot,
      "id" | "createdAt" | "updatedAt"
    >
  ): Promise<string> => {

    const projectId =
      snapshot.projectId?.trim();

    if (!projectId) {
      throw new Error(
        "Project ID is required."
      );
    }

    const response =
      await fetch(
        `${API_BASE_URL}/api/projects/${encodeURIComponent(
          projectId
        )}/snapshots`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body:
            JSON.stringify(
              snapshot
            ),
        }
      );

    const data =
      await parseApiResponse(
        response,
        "Create snapshot API"
      );

    if (
      typeof data !== "object" ||
      data === null ||
      !("snapshotId" in data) ||
      typeof (
        data as {
          snapshotId?: unknown;
        }
      ).snapshotId !== "string"
    ) {
      throw new Error(
        "Create snapshot API did not return a snapshot ID."
      );
    }

    const snapshotId = (
      data as {
        snapshotId: string;
      }
    ).snapshotId;

    invalidatePortfolioCache();

    return snapshotId;
  };


// ==================================================
// GET PROJECT SNAPSHOTS
// ==================================================

export const getProjectSnapshots =
  async (
    projectId: string
  ): Promise<ProjectSnapshot[]> => {

    const cleanProjectId =
      projectId.trim();

    if (!cleanProjectId) {
      throw new Error(
        "Project ID is required."
      );
    }

    const response =
      await fetch(
        `${API_BASE_URL}/api/projects/${encodeURIComponent(
          cleanProjectId
        )}/snapshots`
      );

    const data =
      await parseApiResponse(
        response,
        "Snapshot API"
      );

    const snapshots =
      typeof data === "object" &&
      data !== null &&
      "snapshots" in data &&
      Array.isArray(
        (
          data as {
            snapshots?: unknown;
          }
        ).snapshots
      )
        ? (
            data as {
              snapshots: ProjectSnapshot[];
            }
          ).snapshots
        : [];

    return snapshots.sort(
      (a, b) => {

        const dateA =
          new Date(
            a.reportDate as string
          ).getTime();

        const dateB =
          new Date(
            b.reportDate as string
          ).getTime();

        return dateB - dateA;
      }
    );
  };


// ==================================================
// GET LATEST SNAPSHOT
// ==================================================

export const getLatestProjectSnapshot =
  async (
    projectId: string
  ): Promise<ProjectSnapshot | null> => {

    const snapshots =
      await getProjectSnapshots(
        projectId
      );

    if (
      snapshots.length === 0
    ) {
      return null;
    }

    return snapshots[0];
  };


// ==================================================
// UPDATE PROJECT SNAPSHOT
// ==================================================

export const updateProjectSnapshot =
  async (
    id: string,
    updates: Partial<ProjectSnapshot>
  ): Promise<void> => {

    const cleanSnapshotId =
      id.trim();

    if (!cleanSnapshotId) {
      throw new Error(
        "Snapshot ID is required."
      );
    }

    const cleanedData =
      Object.fromEntries(
        Object.entries(
          updates
        ).filter(
          ([, value]) =>
            value !== undefined
        )
      );

    const response =
      await fetch(
        `${API_BASE_URL}/api/snapshots/${encodeURIComponent(
          cleanSnapshotId
        )}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body:
            JSON.stringify(
              cleanedData
            ),
        }
      );

    await parseApiResponse(
      response,
      "Update snapshot API"
    );

    invalidatePortfolioCache();
  };


// ==================================================
// DELETE PROJECT SNAPSHOT
// ==================================================

export const deleteProjectSnapshot =
  async (
    id: string
  ): Promise<void> => {

    const cleanSnapshotId =
      id.trim();

    if (!cleanSnapshotId) {
      throw new Error(
        "Snapshot ID is required."
      );
    }

    const response =
      await fetch(
        `${API_BASE_URL}/api/snapshots/${encodeURIComponent(
          cleanSnapshotId
        )}`,
        {
          method: "DELETE",
        }
      );

    await parseApiResponse(
      response,
      "Delete snapshot API"
    );

    invalidatePortfolioCache();
  };


// ==================================================
// GET ALL PROJECT SNAPSHOTS
// ==================================================

export const getAllProjectSnapshots =
  async (
    force = false
  ): Promise<ProjectSnapshot[]> => {

    return cachedFetch(
      CACHE_KEYS.snapshots,
      async () => {
        const response =
          await fetch(
            `${API_BASE_URL}/api/snapshots`
          );

        const data =
          await parseApiResponse(
            response,
            "Snapshots API"
          );

        const snapshots =
          typeof data === "object" &&
          data !== null &&
          "snapshots" in data &&
          Array.isArray(
            (
              data as {
                snapshots?: unknown;
              }
            ).snapshots
          )
            ? (
                data as {
                  snapshots: ProjectSnapshot[];
                }
              ).snapshots
            : [];

        return snapshots;
      },
      { force }
    );
  };