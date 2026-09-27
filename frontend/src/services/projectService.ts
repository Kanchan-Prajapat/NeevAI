import type {
  Project,
} from "../../../shared/types";


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
// CREATE PROJECT
// ==================================================

export const createProject = async (
  project: Omit<
    Project,
    "id" | "createdAt" | "updatedAt"
  >
): Promise<string> => {

  const projectId =
    project.projectId?.trim();

  if (!projectId) {
    throw new Error(
      "Project ID is required."
    );
  }

  const response =
    await fetch(
      `${API_BASE_URL}/api/projects`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body:
          JSON.stringify({
            ...project,
            projectId,
          }),
      }
    );

  const data =
    await parseApiResponse(
      response,
      "Create project API"
    );

  if (
    typeof data !== "object" ||
    data === null ||
    !("documentId" in data) ||
    typeof (
      data as {
        documentId?: unknown;
      }
    ).documentId !== "string"
  ) {
    throw new Error(
      "Create project API did not return a document ID."
    );
  }

  return (
    data as {
      documentId: string;
    }
  ).documentId;
};


// ==================================================
// GET ALL PROJECTS
// ==================================================

export const getProjects =
  async (): Promise<Project[]> => {

    const response =
      await fetch(
        `${API_BASE_URL}/api/projects`
      );

    const data =
      await parseApiResponse(
        response,
        "Projects API"
      );

    const projects =
      typeof data === "object" &&
      data !== null &&
      "projects" in data &&
      Array.isArray(
        (
          data as {
            projects?: unknown;
          }
        ).projects
      )
        ? (
            data as {
              projects: Project[];
            }
          ).projects
        : [];

    return projects;
  };


// ==================================================
// GET PROJECT BY OFFICIAL PROJECT ID
// ==================================================

export const getProjectByProjectId =
  async (
    projectId: string
  ): Promise<Project | null> => {

    const cleanProjectId =
      projectId.trim();

    if (!cleanProjectId) {
      throw new Error(
        "Project ID is required."
      );
    }

    const projects =
      await getProjects();

    return (
      projects.find(
        (project) =>
          project.projectId ===
          cleanProjectId
      ) || null
    );
  };


// ==================================================
// UPDATE PROJECT
// ==================================================

export const updateProject =
  async (
    id: string,
    projectData: Partial<Project>
  ): Promise<void> => {

    const cleanDocumentId =
      id.trim();

    if (!cleanDocumentId) {
      throw new Error(
        "Project document ID is required."
      );
    }

    const cleanedData =
      Object.fromEntries(
        Object.entries(
          projectData
        ).filter(
          ([, value]) =>
            value !== undefined
        )
      );

    const response =
      await fetch(
        `${API_BASE_URL}/api/projects/${encodeURIComponent(
          cleanDocumentId
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
      "Update project API"
    );
  };