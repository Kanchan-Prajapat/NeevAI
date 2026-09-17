import type { TimestampValue } from "./common";

export type ProjectDomain =
  | "Roads & Highways"
  | "Healthcare";

export interface Project {
  id?: string;

  projectId: string;

  projectName: string;

  domain: ProjectDomain;

  projectType?: string;

  ministry: string;

  implementingAgency?: string;

  state?: string;

  districtOrLocation?: string;

  approvalDate?: TimestampValue | string | null;

  originalCostCr?: number | null;

  originalCompletionDate?:
    | TimestampValue
    | string
    | null;

  dataSource: string;

  sourceProjectCode?: string;

  createdAt?: TimestampValue;

  updatedAt?: TimestampValue;
}