import type { Project } from "../../../shared/types/project";
import type { ProjectSnapshot } from "../../../shared/types/projectSnapshot";

export interface BenchmarkProject {
  project: Project;
  snapshot: ProjectSnapshot;
  costVariancePct: number | null;
  financialProgressPct: number | null;
  scheduleStatus: string;
}

const getDateValue = (
  value: unknown
): number => {
  if (!value) return 0;

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (
      (value as { toDate: () => Date }).toDate().getTime()
    );
  }

  if (typeof value === "string") {
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
  }

  return 0;
};

const getLatestSnapshot = (
  snapshots: ProjectSnapshot[]
): ProjectSnapshot | null => {
  if (snapshots.length === 0) return null;

  return [...snapshots].sort(
    (a, b) =>
      getDateValue(b.reportDate) -
      getDateValue(a.reportDate)
  )[0];
};

export const getBenchmarkProjects = async (
  currentProject: Project
): Promise<BenchmarkProject[]> => {
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "http://127.0.0.1:8000";

  const projectsResponse = await fetch(
    `${API_BASE_URL}/api/projects`
  );

  let projectsData: unknown;

  try {
    projectsData = await projectsResponse.json();
  } catch {
    throw new Error(
      `Projects API returned an invalid response (${projectsResponse.status}).`
    );
  }

  if (!projectsResponse.ok) {
    throw new Error(
      `Projects API failed with status ${projectsResponse.status}.`
    );
  }

  if (
    typeof projectsData !== "object" ||
    projectsData === null ||
    !("success" in projectsData) ||
    (projectsData as { success?: unknown }).success !== true
  ) {
    throw new Error(
      "Projects API returned an unsuccessful response."
    );
  }

  const projects =
    "projects" in projectsData &&
    Array.isArray(
      (projectsData as { projects?: unknown }).projects
    )
      ? ((projectsData as {
          projects: Project[];
        }).projects ?? [])
      : [];

  const comparableProjects = projects.filter(
    (project) =>
      project.projectId !== currentProject.projectId &&
      project.domain === currentProject.domain
  );

  const results: BenchmarkProject[] = [];

  for (const project of comparableProjects) {
    if (!project.projectId) {
      continue;
    }

    try {
      const snapshotResponse = await fetch(
        `${API_BASE_URL}/api/projects/${encodeURIComponent(
          project.projectId
        )}/snapshots`
      );

      if (!snapshotResponse.ok) {
        continue;
      }

      const snapshotData = await snapshotResponse.json();

      if (
        typeof snapshotData !== "object" ||
        snapshotData === null ||
        !("success" in snapshotData) ||
        (snapshotData as { success?: unknown }).success !== true
      ) {
        continue;
      }

      const snapshots =
        "snapshots" in snapshotData &&
        Array.isArray(
          (snapshotData as { snapshots?: unknown }).snapshots
        )
          ? ((snapshotData as {
              snapshots: ProjectSnapshot[];
            }).snapshots ?? [])
          : [];

      const latestSnapshot =
        getLatestSnapshot(snapshots);

      if (!latestSnapshot) {
        continue;
      }

      const originalCost =
        latestSnapshot.originalCostCr ??
        project.originalCostCr ??
        null;

      const revisedCost =
        latestSnapshot.revisedCostCr ??
        null;

      let costVariancePct: number | null = null;

      if (
        originalCost !== null &&
        revisedCost !== null &&
        originalCost > 0
      ) {
        costVariancePct =
          ((revisedCost - originalCost) /
            originalCost) *
          100;
      }

      let financialProgressPct: number | null =
        null;

      if (
        revisedCost !== null &&
        revisedCost > 0 &&
        latestSnapshot.cumulativeExpenditureCr !==
          null &&
        latestSnapshot.cumulativeExpenditureCr !==
          undefined
      ) {
        financialProgressPct =
          (latestSnapshot.cumulativeExpenditureCr /
            revisedCost) *
          100;
      }

      let scheduleStatus = "Unknown";

      if (
        latestSnapshot.revisedCompletionDate
      ) {
        const completionDate =
          getDateValue(
            latestSnapshot.revisedCompletionDate
          );

        if (completionDate > 0) {
          scheduleStatus =
            completionDate < Date.now()
              ? "Delayed / Past Target"
              : "Within Target";
        }
      }

      results.push({
        project,
        snapshot: latestSnapshot,
        costVariancePct,
        financialProgressPct,
        scheduleStatus,
      });
    } catch {
      // Ignore individual benchmark project failures
      // so one unavailable snapshot does not break
      // the complete benchmarking section.
      continue;
    }
  }

  return results;
};