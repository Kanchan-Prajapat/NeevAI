import type { TimestampValue } from "./common";

export type ProjectDomain =
  | "Roads & Highways"
  | "Healthcare";

export interface Project {
  id?: string;

  // Unique official project identifier
  projectId: string;

  // Official project name
  projectName: string;

  // Domain
  domain: ProjectDomain;

  // Project classification
  projectType?: string;

  // Government organization
  ministry: string;

  // Implementing organization
  implementingAgency?: string;

  // Location
  state?: string;

  districtOrLocation?: string;

  // Approval
  approvalDate?: TimestampValue | string | null;

  // Original approved project cost
  originalCostCr?: number | null;

  // Original planned completion date
  originalCompletionDate?: TimestampValue | string | null;

  // Source information
  dataSource: string;

  sourceProjectCode?: string;

  // Metadata
  createdAt?: TimestampValue;

  updatedAt?: TimestampValue;
}