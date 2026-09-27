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

import {
  getPredictionsByProjectId,
} from "./predictionService";

import {
  getDerivedMetricBySnapshot,
} from "./derivedMetricService";

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

export const getDashboardAnalytics =
  async (): Promise<DashboardAnalytics> => {
    try {
      /*
       * =====================================
       * LOAD PROJECTS + SNAPSHOTS ONCE
       * =====================================
       */

      const [
        projects,
        snapshots,
      ] = await Promise.all([
        getProjects(),
        getAllProjectSnapshots(),
      ]);


      /*
       * =====================================
       * CREATE LATEST SNAPSHOT MAP
       * =====================================
       */

      const latestSnapshots =
        getLatestSnapshotsMap(
          snapshots
        );


      /*
       * =====================================
       * BUILD PROJECT DASHBOARD ITEMS
       * =====================================
       */

      const projectItems =
        await Promise.all(
          projects.map(
            async (
              project: Project
            ): Promise<ProjectDashboardItem> => {

              /*
               * ---------------------------------
               * GET LATEST SNAPSHOT
               * ---------------------------------
               */

              const latestSnapshot =
                latestSnapshots.get(
                  project.projectId
                );


              /*
               * ---------------------------------
               * GET OLD PREDICTION
               * ---------------------------------
               *
               * Kept temporarily for existing
               * dashboard compatibility.
               */

              let prediction:
                | Prediction
                | null = null;

              try {
                const predictions =
                  await getPredictionsByProjectId(
                    project.projectId
                  );

                if (
                  predictions &&
                  predictions.length > 0
                ) {
                  prediction =
                    predictions.reduce(
                      (
                        latest,
                        current
                      ) => {
                        const latestTime =
                          getTimestampMilliseconds(
                            latest.createdAt
                          );

                        const currentTime =
                          getTimestampMilliseconds(
                            current.createdAt
                          );

                        return currentTime >
                          latestTime
                          ? current
                          : latest;
                      }
                    );
                }
              } catch (error) {
                console.error(
                  `Failed to load predictions for ${project.projectId}`,
                  error
                );
              }


              /*
               * ---------------------------------
               * GET PHASE 4 DERIVED METRIC
               * ---------------------------------
               */

              let derivedMetric:
                | DerivedMetric
                | null = null;

              if (latestSnapshot?.id) {
                try {
                  derivedMetric =
                    await getDerivedMetricBySnapshot(
                      project.projectId,
                      latestSnapshot.id
                    );
                } catch (error) {
                  console.error(
                    `Failed to load derived metrics for ${project.projectId}`,
                    error
                  );
                }
              }


              /*
               * ---------------------------------
               * BUDGET
               * ---------------------------------
               *
               * Prefer revised cost from the
               * latest snapshot.
               *
               * Fall back to original project cost.
               */

              const budget =
                safeNumber(
                  croreToRupees(
                    latestSnapshot
                      ?.revisedCostCr ??
                      project.originalCostCr
                  )
                );


              /*
               * ---------------------------------
               * EXPENDITURE
               * ---------------------------------
               *
               * Latest snapshot only.
               */

              const expenditure =
                safeNumber(
                  croreToRupees(
                    latestSnapshot
                      ?.cumulativeExpenditureCr
                  )
                );


              /*
               * ---------------------------------
               * PHYSICAL PROGRESS
               * ---------------------------------
               */

              const progressPercentage =
                safeNumber(
                  latestSnapshot
                    ?.physicalProgressPct
                );


              /*
               * ---------------------------------
               * STATUS
               * ---------------------------------
               *
               * Status belongs to the snapshot
               * in the current Project schema.
               */

              const status =
                latestSnapshot
                  ?.projectStatus;


              /*
               * ---------------------------------
               * RETURN DASHBOARD ITEM
               * ---------------------------------
               */

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

                /*
                 * Existing prediction kept
                 * for compatibility.
                 */

                prediction,

                dataStatus:
                  prediction
                    ?.dataStatus,

                /*
                 * Phase 4 risk is now sourced
                 * from DerivedMetric.
                 */

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
          )
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

    } catch (error) {
      console.error(
        "Failed to generate dashboard analytics:",
        error
      );

      throw error;
    }
  };