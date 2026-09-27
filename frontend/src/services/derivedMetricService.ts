import type { DerivedMetric } from "../../../shared/types";


/*
 * Get derived metrics for a specific
 * project + snapshot.
 */
export const getDerivedMetricBySnapshot = async (
  projectId: string,
  snapshotId: string
): Promise<DerivedMetric | null> => {
  const cleanProjectId = projectId.trim();
  const cleanSnapshotId = snapshotId.trim();

  if (!cleanProjectId) {
    throw new Error("Project ID is required.");
  }

  if (!cleanSnapshotId) {
    throw new Error("Snapshot ID is required.");
  }

  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "http://127.0.0.1:8000";

  const response = await fetch(
    `${API_BASE_URL}/api/projects/${encodeURIComponent(
      cleanProjectId
    )}/snapshots/${encodeURIComponent(
      cleanSnapshotId
    )}/derived-metric`
  );

  let data: unknown;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `Derived metric API returned an invalid response (${response.status}).`
    );
  }

  if (!response.ok) {
    const detail =
      typeof data === "object" &&
      data !== null &&
      "detail" in data &&
      typeof (data as { detail?: unknown }).detail === "string"
        ? (data as { detail: string }).detail
        : `Derived metric API failed with status ${response.status}.`;

    throw new Error(detail);
  }

  if (
    typeof data !== "object" ||
    data === null ||
    !("success" in data) ||
    (data as { success?: unknown }).success !== true
  ) {
    throw new Error(
      "Derived metric API returned an unsuccessful response."
    );
  }

  const derivedMetric =
    "derivedMetric" in data
      ? (data as {
          derivedMetric?: DerivedMetric | null;
        }).derivedMetric
      : null;

  return derivedMetric ?? null;
};