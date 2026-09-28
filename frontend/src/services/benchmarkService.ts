import type { Project } from "../../../shared/types/project";
import type { ProjectSnapshot } from "../../../shared/types/projectSnapshot";

import { getProjects } from "./projectService";
import { getAllProjectSnapshots } from "./projectSnapshotService";

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
  const [projects, allSnapshots] = await Promise.all([
    getProjects(),
    getAllProjectSnapshots(),
  ]);

  const snapshotsByProject =
    new Map<string, ProjectSnapshot[]>();

  for (const snapshot of allSnapshots) {
    const existing = snapshotsByProject.get(snapshot.projectId);

    if (existing) {
      existing.push(snapshot);
    } else {
      snapshotsByProject.set(snapshot.projectId, [snapshot]);
    }
  }

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

    const latestSnapshot = getLatestSnapshot(
      snapshotsByProject.get(project.projectId) ?? []
    );

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
  }

  return results;
};
