import type {
  Project,
  ProjectSnapshot,
  Prediction,
  DerivedMetric,
} from "../../../shared/types";

import { getProjects } from "./projectService";

import {
  getAllProjectSnapshots,
} from "./projectSnapshotService";

import { calculateProjectRisk } from "./riskService";

import {
  CACHE_KEYS,
  cachedFetch,
} from "./dataCache";

/* =========================================
   DASHBOARD PROJECT ITEM
========================================= */

export interface ProjectDashboardItem {
  projectId: string;

  projectName: string;

  projectType?: string;

  domain: Project["domain"];

  ministry: string;

  implementingAgency?: string;

  state?: string;

  status?: string;

  originalCostCr?: number | null;

  budget: number;

  expenditure: number;

  progressPercentage: number;

  healthStatus?:
    ProjectSnapshot["healthStatus"];

  riskLevel?:
    DerivedMetric["riskLevel"];

  riskScore?: number;

  riskComponents?:
    DerivedMetric["riskComponents"];

  dataStatus?:
    Prediction["dataStatus"];

  latestSnapshotDate: unknown;

  prediction: Prediction | null;
}

/* =========================================
   DASHBOARD ANALYTICS
========================================= */

export interface DashboardAnalytics {
  totalProjects: number;

  plannedProjects: number;

  ongoingProjects: number;

  delayedProjects: number;

  completedProjects: number;

  stalledProjects: number;

  totalBudget: number;

  totalExpenditure: number;

  averageProgress: number;

  highRiskProjects: number;

  mediumRiskProjects: number;

  lowRiskProjects: number;

  criticalRiskProjects: number;

  projects: ProjectDashboardItem[];
}


/* =========================================
   SAFE NUMBER
========================================= */

const safeNumber = (
  value: unknown
): number => {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return value;
};


/* =========================================
   TIMESTAMP CONVERSION
========================================= */

const getTimestampMilliseconds = (
  value: unknown
): number => {
  if (!value) {
    return 0;
  }

  /*
   * JavaScript Date
   */

  if (value instanceof Date) {
    return value.getTime();
  }

  /*
   * Firestore Timestamp
   */

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (
      value as {
        toDate?: unknown;
      }
    ).toDate === "function"
  ) {
    return (
      value as {
        toDate: () => Date;
      }
    )
      .toDate()
      .getTime();
  }

  /*
   * Date string
   */

  if (typeof value === "string") {
    const time =
      new Date(value).getTime();

    return Number.isNaN(time)
      ? 0
      : time;
  }

  return 0;
};


/* =========================================
   GET LATEST SNAPSHOT
========================================= */

const getLatestSnapshotsMap = (
  snapshots: ProjectSnapshot[]
): Map<string, ProjectSnapshot> => {
  const latestSnapshots =
    new Map<string, ProjectSnapshot>();

  for (const snapshot of snapshots) {
    const existingSnapshot =
      latestSnapshots.get(
        snapshot.projectId
      );

    /*
     * First snapshot
     */

    if (!existingSnapshot) {
      latestSnapshots.set(
        snapshot.projectId,
        snapshot
      );

      continue;
    }

    const currentTime =
      getTimestampMilliseconds(
        snapshot.reportDate
      );

    const existingTime =
      getTimestampMilliseconds(
        existingSnapshot.reportDate
      );

    /*
     * Replace with newer snapshot
     */

    if (currentTime > existingTime) {
      latestSnapshots.set(
        snapshot.projectId,
        snapshot
      );
    }
  }

  return latestSnapshots;
};


/* =========================================
   CRORE TO RUPEES
========================================= */

/*
 * Dashboard currently displays financial
 * values in Rupees.
 *
 * 1 Crore = 10,000,000 Rupees
 */

const croreToRupees = (
  value?: number | null
): number | null => {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  if (!Number.isFinite(value)) {
    return null;
  }

  return value * 10_000_000;
};


/* =========================================
   NORMALIZE RISK LEVEL
========================================= */

const normalizeRiskLevel = (
  riskLevel:
    | DerivedMetric["riskLevel"]
    | undefined
): string => {
  if (!riskLevel) {
    return "";
  }

  return String(riskLevel)
    .trim()
    .toLowerCase();
};


/* =========================================
   MAIN DASHBOARD ANALYTICS
========================================= */

const getSnapshotDataStatus = (
  snapshot?: ProjectSnapshot
): Prediction["dataStatus"] | undefined => {
  if (!snapshot) {
    return "insufficient_data";
  }

  const hasCost =
    snapshot.revisedCostCr != null ||
    snapshot.originalCostCr != null;
  const hasSpend =
    snapshot.cumulativeExpenditureCr != null;
  const hasProgress =
    snapshot.physicalProgressPct != null;

  if (hasCost && hasSpend && hasProgress) {
    return "complete";
  }

  if (hasCost || hasSpend || hasProgress) {
    return "partial";
  }

  return "insufficient_data";
};

const buildDashboardAnalytics = (
  projects: Project[],
  snapshots: ProjectSnapshot[]
): DashboardAnalytics => {
      const latestSnapshots =
        getLatestSnapshotsMap(
          snapshots
        );

      const snapshotsByProject =
        new Map<string, ProjectSnapshot[]>();

      for (const snapshot of snapshots) {
        const existing =
          snapshotsByProject.get(
            snapshot.projectId
          );

        if (existing) {
          existing.push(snapshot);
        } else {
          snapshotsByProject.set(
            snapshot.projectId,
            [snapshot]
          );
        }
      }

      const projectItems =
        projects.map(
          (
            project: Project
          ): ProjectDashboardItem => {

              const latestSnapshot =
                latestSnapshots.get(
                  project.projectId
                );

              let derivedMetric:
                | DerivedMetric
                | null = null;

              if (latestSnapshot) {
                const projectSnapshots =
                  snapshotsByProject.get(
                    project.projectId
                  ) ?? [];

                const previousSnapshot =
                  projectSnapshots
                    .filter(
                      (snapshot) =>
                        snapshot !== latestSnapshot
                    )
                    .sort(
                      (left, right) =>
                        getTimestampMilliseconds(
                          right.reportDate
                        ) -
                        getTimestampMilliseconds(
                          left.reportDate
                        )
                    )[0];

                try {
                  const risk =
                    calculateProjectRisk(
                      project,
                      latestSnapshot,
                      previousSnapshot
                    );

                  derivedMetric = {
                    projectId:
                      project.projectId,
                    snapshotId:
                      latestSnapshot.id,
                    financialProgress:
                      risk.financialProgress,
                    physicalProgress:
                      risk.physicalProgress,
                    costVariance:
                      risk.costVariance,
                    expectedVelocity:
                      risk.expectedVelocity,
                    actualVelocity:
                      risk.actualVelocity,
                    scheduleVariance:
                      risk.scheduleVariance,
                    riskComponents:
                      risk.riskComponents,
                    overallRiskScore:
                      risk.overallRiskScore,
                    riskLevel:
                      risk.riskLevel,
                  };
                } catch (error) {
                  console.error(
                    `Failed to calculate risk for ${project.projectId}`,
                    error
                  );
                }
              }

              const budget =
                safeNumber(
                  croreToRupees(
                    latestSnapshot
                      ?.revisedCostCr ??
                      project.originalCostCr
                  )
                );

              const expenditure =
                safeNumber(
                  croreToRupees(
                    latestSnapshot
                      ?.cumulativeExpenditureCr
                  )
                );

              const progressPercentage =
                safeNumber(
                  latestSnapshot
                    ?.physicalProgressPct
                );

              const status =
                latestSnapshot
                  ?.projectStatus;

              return {
                projectId:
                  project.projectId,

                projectName:
                  project.projectName,

                projectType:
                  project.projectType,

                domain:
                  project.domain,

                  ministry: project.ministry,

                implementingAgency:
                  project.implementingAgency,

                status,

                budget,

                expenditure,

                progressPercentage,

                healthStatus:
                  latestSnapshot
                    ?.healthStatus,

                latestSnapshotDate:
                  latestSnapshot
                    ?.reportDate,

                prediction: null,

                dataStatus:
                  getSnapshotDataStatus(
                    latestSnapshot
                  ),

                riskLevel:
                  derivedMetric
                    ?.riskLevel,

                riskScore:
                  derivedMetric
                    ?.overallRiskScore,

                riskComponents:
                  derivedMetric
                    ?.riskComponents,
              };
          }
        );

      const uniqueProjectItems = Array.from(
        new Map(
          projectItems.map((project) => [
            project.projectId,
            project,
          ])
        ).values()
      );


      /*
       * =====================================
       * PROJECT COUNTS
       * =====================================
       */

      const totalProjects =
        uniqueProjectItems.length;


      const plannedProjects =
        uniqueProjectItems.filter(
          (project) =>
            project.status
              ?.trim()
              .toLowerCase() ===
            "planned"
        ).length;


      const ongoingProjects =
        uniqueProjectItems.filter(
          (project) =>
            project.status
              ?.trim()
              .toLowerCase() ===
            "ongoing"
        ).length;


      const delayedProjects =
        uniqueProjectItems.filter(
          (project) =>
            project.status
              ?.trim()
              .toLowerCase() ===
            "delayed"
        ).length;


      const completedProjects =
        uniqueProjectItems.filter(
          (project) =>
            project.status
              ?.trim()
              .toLowerCase() ===
            "completed"
        ).length;


      const stalledProjects =
        uniqueProjectItems.filter(
          (project) =>
            project.status
              ?.trim()
              .toLowerCase() ===
            "stalled"
        ).length;


      /*
       * =====================================
       * FINANCIAL TOTALS
       * =====================================
       */

      const totalBudget =
        uniqueProjectItems.reduce(
          (
            total,
            project
          ) =>
            total +
            safeNumber(
              project.budget
            ),
          0
        );


      const totalExpenditure =
        uniqueProjectItems.reduce(
          (
            total,
            project
          ) =>
            total +
            safeNumber(
              project.expenditure
            ),
          0
        );


      /*
       * =====================================
       * AVERAGE PROGRESS
       * =====================================
       */

      const averageProgress =
        totalProjects > 0
          ? uniqueProjectItems.reduce(
              (
                total,
                project
              ) =>
                total +
                safeNumber(
                  project.progressPercentage
                ),
              0
            ) / totalProjects
          : 0;


      /*
       * =====================================
       * RISK ANALYTICS
       * =====================================
       */

      const highRiskProjects =
        uniqueProjectItems.filter(
          (project) =>
            normalizeRiskLevel(
              project.riskLevel
            ) === "high"
        ).length;


      const mediumRiskProjects =
        uniqueProjectItems.filter(
          (project) =>
            normalizeRiskLevel(
              project.riskLevel
            ) === "medium"
        ).length;


      const lowRiskProjects =
        uniqueProjectItems.filter(
          (project) =>
            normalizeRiskLevel(
              project.riskLevel
            ) === "low"
        ).length;


      const criticalRiskProjects =
        uniqueProjectItems.filter(
          (project) =>
            normalizeRiskLevel(
              project.riskLevel
            ) === "critical"
        ).length;


      /*
       * =====================================
       * RETURN FINAL DASHBOARD ANALYTICS
       * =====================================
       */

      return {
        totalProjects,

        plannedProjects,

        ongoingProjects,

        delayedProjects,

        completedProjects,

        stalledProjects,

        totalBudget,

        totalExpenditure,

        averageProgress,

        highRiskProjects,

        mediumRiskProjects,

        lowRiskProjects,

        criticalRiskProjects,

        projects:
          uniqueProjectItems,
      };
};

export const getDashboardAnalytics =
  async (
    force = false
  ): Promise<DashboardAnalytics> => {
    try {
      return await cachedFetch(
        CACHE_KEYS.dashboardAnalytics,
        async () => {
          const [
            projects,
            snapshots,
          ] = await Promise.all([
            getProjects(force),
            getAllProjectSnapshots(force),
          ]);

          return buildDashboardAnalytics(
            projects,
            snapshots
          );
        },
        { force }
      );
    } catch (error) {
      console.error(
        "Failed to generate dashboard analytics:",
        error
      );

      throw error;
    }
  };