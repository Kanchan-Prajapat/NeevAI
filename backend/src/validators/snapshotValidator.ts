import { isValidISODate } from '../utils/dateValidator';
import { isValidNumber } from '../utils/numberValidator';
import { ReportType } from '../constants';

export interface SnapshotRow {
  projectCode: string;
  snapshotDate: string;
  reportType: string;
  percentComplete: string;
  actualCost: string;
}

export function validateSnapshotRow(row: SnapshotRow) {
  const errors: string[] = [];
  if (!row.projectCode || row.projectCode.trim() === '') errors.push('projectCode is required');
  if (!isValidISODate(row.snapshotDate)) errors.push('snapshotDate must be a valid ISO date');
  if (!ReportType.includes(row.reportType as any)) errors.push(`reportType must be one of ${ReportType.join(', ')}`);
  if (!isValidNumber(row.percentComplete)) errors.push('percentComplete must be a non‑blank numeric value');
  if (!isValidNumber(row.actualCost)) errors.push('actualCost must be a non‑blank numeric value');
  const valid = errors.length === 0;
  return { valid, errors } as const;
}
