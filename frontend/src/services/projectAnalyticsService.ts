import type {
  Project,
  ProjectSnapshot,
  Prediction,
} from "../../../shared/types";

import {
  getProjects,
} from "./projectService";

import {
  getAllProjectSnapshots,
} from "./projectSnapshotService";

import {
  getPredictionsByProjectId,
} from "./predictionService";


/* =========================================
   DASHBOARD PROJECT ITEM
========================================= */

export interface ProjectDashboardItem {
  projectId: string;

  projectName: string;

  projectType?: string;

  domain: Project["domain"];

  implementingAgency?: string;

  status?: string;

  budget: number;

  expenditure: number;

  progressPercentage: number;

  healthStatus?:
    ProjectSnapshot["healthStatus"];

  riskLevel?:
    Prediction["riskLevel"];

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

  projects: ProjectDashboardItem[];

}


/* =========================================
   SAFE NUMBER
========================================= */

/**
 * Prevent NaN values from entering
 * dashboard calculations.
 */
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

/**
 * Convert Firestore Timestamp,
 * JavaScript Date, or string
 * into milliseconds.
 */
const getTimestampMilliseconds = (
  value: unknown
): number => {

  if (!value) {
    return 0;
  }


  /* JavaScript Date */

  if (
    value instanceof Date
  ) {
    return value.getTime();
  }


  /* Firestore Timestamp */

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


  /* Date String */

  if (
    typeof value === "string"
  ) {

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

/**
 * Creates a map containing
 * the latest snapshot for
 * every project.
 */
const getLatestSnapshotsMap = (
  snapshots: ProjectSnapshot[]
): Map<
  string,
  ProjectSnapshot
> => {

  const latestSnapshots =
    new Map<
      string,
      ProjectSnapshot
    >();


  for (
    const snapshot
    of snapshots
  ) {

    const existingSnapshot =
      latestSnapshots.get(
        snapshot.projectId
      );


    /* First snapshot */

    if (
      !existingSnapshot
    ) {

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


    /* Replace with newer snapshot */

    if (
      currentTime > existingTime
    ) {

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

/**
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


  if (
    !Number.isFinite(value)
  ) {
    return null;
  }


  return value * 10_000_000;

};


/* =========================================
   NORMALIZE RISK LEVEL
========================================= */

/**
 * Handles risk values safely,
 * regardless of capitalization.
 */
const normalizeRiskLevel = (
  riskLevel:
    | Prediction["riskLevel"]
    | undefined
): string => {

  if (!riskLevel) {
    return "";
  }


  return String(
    riskLevel
  )
    .trim()
    .toLowerCase();

};


/* =========================================
   MAIN DASHBOARD ANALYTICS
========================================= */
export const getDashboardAnalytics =
  async (): Promise<
    DashboardAnalytics
  > => {

    try {

      /* =====================================
         LOAD PROJECTS + SNAPSHOTS ONCE
      ===================================== */

      const [
        projects,
        snapshots,
      ] =
        await Promise.all([
          getProjects(),
          getAllProjectSnapshots(),
        ]);


      /* =====================================
         CREATE LATEST SNAPSHOT MAP
      ===================================== */

      const latestSnapshots =
        getLatestSnapshotsMap(
          snapshots
        );


      /* =====================================
         BUILD PROJECT DASHBOARD ITEMS
      ===================================== */

      const projectItems =
        await Promise.all(

          projects.map(

            async (
              project: Project
            ): Promise<
              ProjectDashboardItem
            > => {

              /* ---------------------------------
                 GET LATEST SNAPSHOT
              --------------------------------- */

              const latestSnapshot =
                latestSnapshots.get(
                  project.projectId
                );


              /* ---------------------------------
                 GET PREDICTIONS
              --------------------------------- */

              let prediction:
                | Prediction
                | null =
                null;


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

              } catch (
                error
              ) {

                console.error(
                  `Failed to load predictions for ${project.projectId}`,
                  error
                );

              }


              /* ---------------------------------
                 BUDGET

                 Always use budgetCr
                 consistently from Project.
              --------------------------------- */

              const budget =
                safeNumber(
                  croreToRupees(
                    project.budgetCr
                  )
                );


              /* ---------------------------------
                 EXPENDITURE

                 Latest snapshot only.
              --------------------------------- */

              const expenditure =
                safeNumber(
                  croreToRupees(
                    latestSnapshot
                      ?.cumulativeExpenditureCr
                  )
                );


              /* ---------------------------------
                 PHYSICAL PROGRESS

                 Latest snapshot only.
              --------------------------------- */

              const progressPercentage =
                safeNumber(
                  latestSnapshot
                    ?.physicalProgressPct
                );


              /* ---------------------------------
                 STATUS

                 Prefer latest snapshot status.
                 Fall back to project status.
              --------------------------------- */

              const status =
                latestSnapshot
                  ?.projectStatus
                ??
                project.status;


              /* ---------------------------------
                 RETURN DASHBOARD ITEM
              --------------------------------- */

              return {

                projectId:
                  project.projectId,


                projectName:
                  project.projectName,


                projectType:
                  project.projectType,


                domain:
                  project.domain,


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


                prediction,


                riskLevel:
                  prediction
                    ?.riskLevel,


                dataStatus:
                  prediction
                    ?.dataStatus,

              };

            }

          )

        );


      /* =====================================
         PROJECT COUNTS
      ===================================== */

      const totalProjects =
        projectItems.length;


      const plannedProjects =
        projectItems.filter(
          (
            project
          ) =>
            project.status
              ?.trim()
              .toLowerCase() ===
            "planned"
        ).length;


      const ongoingProjects =
        projectItems.filter(
          (
            project
          ) =>
            project.status
              ?.trim()
              .toLowerCase() ===
            "ongoing"
        ).length;


      const delayedProjects =
        projectItems.filter(
          (
            project
          ) =>
            project.status
              ?.trim()
              .toLowerCase() ===
            "delayed"
        ).length;


      const completedProjects =
        projectItems.filter(
          (
            project
          ) =>
            project.status
              ?.trim()
              .toLowerCase() ===
            "completed"
        ).length;


      const stalledProjects =
        projectItems.filter(
          (
            project
          ) =>
            project.status
              ?.trim()
              .toLowerCase() ===
            "stalled"
        ).length;


      /* =====================================
         FINANCIAL TOTALS
      ===================================== */

      const totalBudget =
        projectItems.reduce(

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
        projectItems.reduce(

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


      /* =====================================
         AVERAGE PROGRESS
      ===================================== */

      const averageProgress =
        totalProjects > 0

          ?

          projectItems.reduce(

            (
              total,
              project
            ) =>

              total +
              safeNumber(
                project.progressPercentage
              ),

            0

          ) /
          totalProjects

          :

          0;


      /* =====================================
         RISK ANALYTICS
      ===================================== */

      const highRiskProjects =
        projectItems.filter(
          (
            project
          ) =>
            normalizeRiskLevel(
              project.riskLevel
            ) === "high"
        ).length;


      const mediumRiskProjects =
        projectItems.filter(
          (
            project
          ) =>
            normalizeRiskLevel(
              project.riskLevel
            ) === "medium"
        ).length;


      const lowRiskProjects =
        projectItems.filter(
          (
            project
          ) =>
            normalizeRiskLevel(
              project.riskLevel
            ) === "low"
        ).length;


      /* =====================================
         RETURN FINAL DASHBOARD ANALYTICS
      ===================================== */

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

        projects:
          projectItems,

      };

    } catch (
      error
    ) {

      console.error(
        "Failed to generate dashboard analytics:",
        error
      );


      throw error;

    }

  };