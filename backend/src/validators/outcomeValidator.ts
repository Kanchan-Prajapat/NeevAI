// src/validators/outcomeValidator.ts
import { isValidISODate } from '../utils/dateValidator';
import { isValidNumber } from '../utils/numberValidator';
import { OutcomeStatuses } from '../constants';

export interface OutcomeRow {
  projectCode: string;
  finalCost: string;
  finalStatus: string;
  completionDate: string;
  notes?: string;
}

export function validateOutcomeRow(row: OutcomeRow) {
  const errors: string[] = [];
  if (!row.projectCode || row.projectCode.trim() === '') errors.push('projectCode is required');
  if (!isValidNumber(row.finalCost)) errors.push('finalCost must be a non‑blank numeric value');
  if (!OutcomeStatuses.includes(row.finalStatus as any)) errors.push(`finalStatus must be one of ${OutcomeStatuses.join(', ')}`);
  if (!isValidISODate(row.completionDate)) errors.push('completionDate must be a valid ISO date');
  const valid = errors.length === 0;
  return { valid, errors } as const;
}
