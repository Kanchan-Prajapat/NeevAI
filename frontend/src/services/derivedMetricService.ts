import type { DerivedMetric } from "../../../shared/types";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import { db } from "../firebase/firebase";

const DERIVED_METRICS_COLLECTION =
  "derivedMetrics";

/*
 * Firestore document ID must not contain "/".
 */
const createDerivedMetricId = (
  projectId: string,
  snapshotId: string
): string => {
  const safeProjectId =
    encodeURIComponent(projectId);

  const safeSnapshotId =
    encodeURIComponent(snapshotId);

  return `${safeProjectId}__${safeSnapshotId}`;
};

/*
 * Get derived metrics for a specific
 * project + snapshot.
 */
export const getDerivedMetricBySnapshot = async (
  projectId: string,
  snapshotId: string
): Promise<DerivedMetric | null> => {
  const derivedMetricId =
    createDerivedMetricId(
      projectId,
      snapshotId
    );

  const metricRef = doc(
    db,
    DERIVED_METRICS_COLLECTION,
    derivedMetricId
  );

  const metricSnapshot =
    await getDoc(metricRef);

  if (!metricSnapshot.exists()) {
    return null;
  }

  return {
    id: metricSnapshot.id,
    ...metricSnapshot.data(),
  } as DerivedMetric;
};