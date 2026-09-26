import type {
  ProjectSnapshot,
} from "../../../shared/types";

import {
  getProjectByProjectId,
} from "./projectService";
import { calculateProjectRisk } from "./riskService";

import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "../firebase/firebase";

const DERIVED_METRICS_COLLECTION =
  "derivedMetrics";

const RECALC_LOGS_COLLECTION =
  "recalcLogs";

const SNAPSHOTS_COLLECTION =
  "projectSnapshots";


/* ==================================================
   GET PROJECT SNAPSHOTS FOR RECALCULATION
================================================== */

const getProjectSnapshotsForRecalculation =
  async (
    projectId: string
  ): Promise<ProjectSnapshot[]> => {

    const snapshotsQuery = query(
      collection(
        db,
        SNAPSHOTS_COLLECTION
      ),
      where(
        "projectId",
        "==",
        projectId
      )
    );

    const snapshot =
      await getDocs(
        snapshotsQuery
      );

    return snapshot.docs.map(
      (document) =>
        ({
          id: document.id,
          ...document.data(),
        }) as ProjectSnapshot
    );
  };


/* ==================================================
   TIMESTAMP CONVERSION
================================================== */
const getTimestampMilliseconds = (
  value: ProjectSnapshot["reportDate"]
): number => {
  if (!value) {
    return 0;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string") {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? 0
      : date.getTime();
  }

  return 0;
};

/* ==================================================
   SORT SNAPSHOTS
================================================== */

const sortSnapshotsByDate = (
  snapshots: ProjectSnapshot[]
): ProjectSnapshot[] => {

  return [...snapshots].sort(
    (a, b) =>
      getTimestampMilliseconds(
        a.reportDate
      ) -
      getTimestampMilliseconds(
        b.reportDate
      )
  );
};


/* ==================================================
   CREATE DERIVED METRIC ID
================================================== */

const createDerivedMetricId = (
  projectId: string,
  snapshotId: string
): string => {

  const safeProjectId =
    encodeURIComponent(
      projectId
    );

  const safeSnapshotId =
    encodeURIComponent(
      snapshotId
    );

  return `${safeProjectId}__${safeSnapshotId}`;
};


/* ==================================================
   RECALCULATE PROJECT
================================================== */

export const recalculateProject =
  async (
    projectId: string
  ): Promise<void> => {

    /*
     * ----------------------------------------------
     * 1. CREATE RECALCULATION LOG
     * ----------------------------------------------
     */

    const logRef =
      await addDoc(
        collection(
          db,
          RECALC_LOGS_COLLECTION
        ),
        {
          projectId,

          status: "started",

          startedAt:
            serverTimestamp(),

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      );


    try {

      /*
       * --------------------------------------------
       * 2. GET PROJECT
       * --------------------------------------------
       */

     const project =
  await getProjectByProjectId(projectId);

      if (!project) {
        throw new Error(
          `Project not found: ${projectId}`
        );
      }


      /*
       * --------------------------------------------
       * 3. GET SNAPSHOTS
       * --------------------------------------------
       */

      const snapshots =
        await getProjectSnapshotsForRecalculation(
          projectId
        );

      if (
        snapshots.length === 0
      ) {
        throw new Error(
          `No snapshots found for project: ${projectId}`
        );
      }


      /*
       * --------------------------------------------
       * 4. SORT SNAPSHOTS
       * --------------------------------------------
       */

      const sortedSnapshots =
        sortSnapshotsByDate(
          snapshots
        );


      /*
       * --------------------------------------------
       * 5. GET LATEST SNAPSHOT
       * --------------------------------------------
       */

      const latestSnapshot =
        sortedSnapshots[
          sortedSnapshots.length - 1
        ];

      if (!latestSnapshot) {
        throw new Error(
          `Unable to determine latest snapshot for project: ${projectId}`
        );
      }


      /*
       * --------------------------------------------
       * 6. GET PREVIOUS SNAPSHOT
       * --------------------------------------------
       */

      const previousSnapshot =
        sortedSnapshots.length > 1
          ? sortedSnapshots[
              sortedSnapshots.length - 2
            ]
          : undefined;


      /*
       * --------------------------------------------
       * 7. CALCULATE RISK
       * --------------------------------------------
       */

      const result =
        calculateProjectRisk(
          project,
          latestSnapshot,
          previousSnapshot
        );


      /*
       * --------------------------------------------
       * 8. VALIDATE SNAPSHOT ID
       * --------------------------------------------
       */

      if (!latestSnapshot.id) {
        throw new Error(
          "Latest snapshot does not have an ID. Cannot save derived metric safely."
        );
      }


      /*
       * --------------------------------------------
       * 9. CREATE DETERMINISTIC METRIC ID
       * --------------------------------------------
       */

      const derivedMetricId =
        createDerivedMetricId(
          projectId,
          latestSnapshot.id
        );


      /*
       * --------------------------------------------
       * 10. SAVE DERIVED METRIC
       * --------------------------------------------
       *
       * setDoc() means recalculating the same
       * project + snapshot updates the same
       * Firestore document.
       */

      await setDoc(
        doc(
          db,
          DERIVED_METRICS_COLLECTION,
          derivedMetricId
        ),
        {
          projectId,

          snapshotId:
            latestSnapshot.id,

          financialProgress:
            result.financialProgress,

          physicalProgress:
            result.physicalProgress,

          costVariance:
            result.costVariance,

          expectedVelocity:
            result.expectedVelocity,

          actualVelocity:
            result.actualVelocity,

          scheduleVariance:
            result.scheduleVariance,

          riskComponents:
            result.riskComponents,

          overallRiskScore:
            result.overallRiskScore,

          riskLevel:
            result.riskLevel,

          computedAt:
            serverTimestamp(),

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      );


      /*
       * --------------------------------------------
       * 11. MARK RECALCULATION COMPLETED
       * --------------------------------------------
       */

      await updateDoc(
        doc(
          db,
          RECALC_LOGS_COLLECTION,
          logRef.id
        ),
        {
          status: "completed",

          endedAt:
            serverTimestamp(),

          computedAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      );

    } catch (error) {

      /*
       * --------------------------------------------
       * 12. MARK RECALCULATION FAILED
       * --------------------------------------------
       */

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown recalculation error";


      await updateDoc(
        doc(
          db,
          RECALC_LOGS_COLLECTION,
          logRef.id
        ),
        {
          status: "failed",

          errorMessage,

          endedAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      );


      throw error;
    }
  };