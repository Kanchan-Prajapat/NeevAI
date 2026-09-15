import { isValidISODate } from '../utils/dateValidator';
import { isValidNumber } from '../utils/numberValidator';
import { ProjectTypes, Sector, ProjectStatus } from '../constants';

export interface ProjectRow {
  projectCode: string;
  name: string;
  sector: string;
  type: string;
  status?: string;
  startDate: string;
  endDate?: string;
  budget: string;
  description?: string;
  source?: string;
}

export function validateProjectRow(row: ProjectRow) {
  const errors: string[] = [];
  if (!row.projectCode || row.projectCode.trim() === '') errors.push('projectCode is required');
  if (!row.name || row.name.trim() === '') errors.push('name is required');
  if (!Sector.includes(row.sector as any)) errors.push(`sector must be one of ${Sector.join(', ')}`);
  if (!ProjectTypes.includes(row.type as any)) errors.push(`type must be one of ${ProjectTypes.join(', ')}`);
  if (row.status && !ProjectStatus.includes(row.status as any)) errors.push(`status must be one of ${ProjectStatus.join(', ')}`);
  if (!isValidISODate(row.startDate)) errors.push('startDate must be a valid ISO date');
  if (row.endDate && !isValidISODate(row.endDate)) errors.push('endDate must be a valid ISO date');
  if (!isValidNumber(row.budget)) errors.push('budget must be a non‑blank numeric value');
  const valid = errors.length === 0;
  return { valid, errors } as const;
}
