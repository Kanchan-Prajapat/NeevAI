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

  /* Project */

  projectId: string;

  projectName: string;

  domain: Project["domain"];

  ministry: string;

  implementingAgency?: string;


  /* Latest Snapshot Information */

  status?: string;

  budgetCr?: number | null;

  expenditureCr?: number | null;

  progressPercentage?: number | null;

  latestSnapshotDate?: unknown;


  /* Prediction Information */

  riskLevel?: Prediction["riskLevel"];

  confidenceScore?: number;

  dataStatus?: Prediction["dataStatus"];

  prediction: Prediction | null;

}


/* =========================================
   DASHBOARD ANALYTICS
========================================= */

export interface DashboardAnalytics {

  /* Project Counts */

  totalProjects: number;

  plannedProjects: number;

  ongoingProjects: number;

  delayedProjects: number;

  completedProjects: number;

  stalledProjects: number;


  /* Financial Analytics */

  totalBudgetCr: number;

  totalExpenditureCr: number;


  /* Progress */

  averageProgress: number;


  /* Risk */

  highRiskProjects: number;

  mediumRiskProjects: number;

  lowRiskProjects: number;


  /* Projects */

  projects: ProjectDashboardItem[];

}


/* =========================================
   GET DASHBOARD ANALYTICS
========================================= */

export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {

  const projects =
    await getProjects();


  const projectAnalytics =
    await Promise.all(

      projects.map(
        async (project) => {

          /* =====================
             SNAPSHOTS
          ===================== */

          const snapshots =
            await getAllProjectSnapshots();


          const projectSnapshots =
            snapshots.filter(
              (snapshot) =>
                snapshot.projectId ===
                project.projectId
            );


          const latestSnapshot =
            projectSnapshots.length > 0
              ? projectSnapshots[
                  projectSnapshots.length - 1
                ]
              : null;


          /* =====================
             PREDICTIONS
          ===================== */

          let prediction: Prediction | null =
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
                predictions[
                  predictions.length - 1
                ];

            }

          } catch (error) {

            console.error(
              `Failed to load prediction for ${project.projectId}`,
              error
            );

          }


          /* =====================
             RETURN PROJECT DATA
          ===================== */

          return {

            projectId:
              project.projectId,

            projectName:
              project.name,

            projectType:
              project.projectType,

            domain:
              project.domain,

            implementingAgency:
              project.implementingAgency,

            status:
              project.status,

            budget:
              typeof project.budget === "number"
                ? project.budget
                : 0,

            expenditure:
              typeof project.expenditure === "number"
                ? project.expenditure
                : 0,

            progressPercentage:
              typeof project.progressPercentage === "number"
                ? project.progressPercentage
                : 0,

            healthStatus:
              latestSnapshot?.healthStatus,

            riskLevel:
              prediction?.riskLevel,

            dataStatus:
              prediction?.dataStatus,

            latestSnapshotDate:
              latestSnapshot?.snapshotDate ??
              null,

            prediction,

          };

        }
      )

    );


  /* =====================
     STATUS COUNTS
  ===================== */

  const getStatusCount =
    (status: string) => {

      return projectAnalytics.filter(
        (project) =>
          project.status
            ?.toLowerCase() ===
          status.toLowerCase()
      ).length;

    };


  const totalProjects =
    projectAnalytics.length;


  const plannedProjects =
    getStatusCount("Planned");


  const ongoingProjects =
    getStatusCount("Ongoing");


  const delayedProjects =
    getStatusCount("Delayed");


  const completedProjects =
    getStatusCount("Completed");


  const stalledProjects =
    getStatusCount("Stalled");


  /* =====================
     FINANCIAL DATA
  ===================== */

  const totalBudget =
    projectAnalytics.reduce(

      (total, project) =>
        total + project.budget,

      0

    );


  const totalExpenditure =
    projectAnalytics.reduce(

      (total, project) =>
        total + project.expenditure,

      0

    );


  /* =====================
     AVERAGE PROGRESS
  ===================== */

  const totalProgress =
    projectAnalytics.reduce(

      (total, project) =>
        total +
        project.progressPercentage,

      0

    );


  const averageProgress =
    totalProjects > 0
      ? totalProgress /
        totalProjects
      : 0;


  /* =====================
     RISK COUNTS
  ===================== */

  const highRiskProjects =
    projectAnalytics.filter(
      (project) =>
        project.riskLevel
          ?.toLowerCase() ===
        "high"
    ).length;


  const mediumRiskProjects =
    projectAnalytics.filter(
      (project) =>
        project.riskLevel
          ?.toLowerCase() ===
        "medium"
    ).length;


  const lowRiskProjects =
    projectAnalytics.filter(
      (project) =>
        project.riskLevel
          ?.toLowerCase() ===
        "low"
    ).length;


  /* =====================
     FINAL ANALYTICS
  ===================== */

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
      projectAnalytics,

  };

}

/* =========================================
   TIMESTAMP HELPER
========================================= */

/**
 * Converts Firestore Timestamp,
 * JavaScript Date or string
 * into milliseconds.
 */
const getTimestampMilliseconds = (
  value: unknown
): number => {

  if (!value) {
    return 0;
  }


  if (value instanceof Date) {
    return value.getTime();
  }


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
    ).toDate().getTime();

  }


  if (typeof value === "string") {

    const timestamp =
      new Date(value).getTime();


    return Number.isNaN(timestamp)
      ? 0
      : timestamp;

  }


  return 0;

};


/* =========================================
   LATEST SNAPSHOT MAP
========================================= */

/**
 * Finds the latest snapshot
 * for every project.
 */
const getLatestSnapshotsMap = (
  snapshots: ProjectSnapshot[]
): Map<string, ProjectSnapshot> => {

  const latestSnapshots =
    new Map<
      string,
      ProjectSnapshot
    >();


  for (
    const snapshot of snapshots
  ) {

    const existingSnapshot =
      latestSnapshots.get(
        snapshot.projectId
      );


    if (!existingSnapshot) {

      latestSnapshots.set(
        snapshot.projectId,
        snapshot
      );

      continue;

    }


    const currentSnapshotTime =
      getTimestampMilliseconds(
        snapshot.reportDate
      );


    const existingSnapshotTime =
      getTimestampMilliseconds(
        existingSnapshot.reportDate
      );


    if (
      currentSnapshotTime >
      existingSnapshotTime
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
   GET LATEST PREDICTION
========================================= */

/**
 * Returns the latest prediction
 * based on createdAt.
 */
const getLatestPrediction = (
  predictions: Prediction[]
): Prediction | null => {

  if (
    !predictions ||
    predictions.length === 0
  ) {
    return null;
  }


  return predictions.reduce(
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


      return currentTime > latestTime
        ? current
        : latest;

    }
  );

};


/* =========================================
   PROJECT COST HELPER
========================================= */

/**
 * Budget priority:
 *
 * Revised Cost
 * ↓
 * Anticipated Cost
 * ↓
 * Original Snapshot Cost
 * ↓
 * Original Project Cost
 */
const getProjectBudgetCr = (
  project: Project,
  snapshot?: ProjectSnapshot
): number => {

  if (
    snapshot?.revisedCostCr !==
    undefined &&
    snapshot.revisedCostCr !== null
  ) {
    return snapshot.revisedCostCr;
  }


  if (
    snapshot?.anticipatedCostCr !==
    undefined &&
    snapshot.anticipatedCostCr !== null
  ) {
    return snapshot.anticipatedCostCr;
  }


  if (
    snapshot?.originalCostCr !==
    undefined &&
    snapshot.originalCostCr !== null
  ) {
    return snapshot.originalCostCr;
  }


  return (
    project.originalCostCr ?? 0
  );

};

