// src/services/importService.ts
import fs from 'fs';
import path from 'path';
import csvParse from 'csv-parse';
import { Model, Document } from 'mongoose';
import { ImportLog } from '../models';
import { validateProjectRow } from '../validators/projectValidator';
import { validateSnapshotRow } from '../validators/snapshotValidator';
import { validateOutcomeRow } from '../validators/outcomeValidator';
import { Project } from '../models/Project';
import { ProjectSnapshot } from '../models/ProjectSnapshot';
import { ProjectOutcome } from '../models/ProjectOutcome';

export interface ImportResult {
  totalRecords: number;
  validRecords: number;
  importedRecords: number;
  skippedRecords: number;
  failedRecords: number;
  errors: Record<number, string[]>; // row index -> errors
}

type RowValidator = (row: any) => { valid: boolean; errors: string[] };

type ModelMap = {
  project: Model<Document>;
  snapshot: Model<Document>;
  outcome: Model<Document>;
};

export class ImportService {
  private importDir = path.resolve('data', 'imports');
  private processedDir = path.resolve('data', 'processed');
  private errorsDir = path.resolve('data', 'errors');

  async importFile(importType: keyof ModelMap, filename: string): Promise<ImportResult> {
    const filePath = path.join(this.importDir, `${importType}s`, filename);
    if (!fs.existsSync(filePath)) throw new Error('File not found');
    const validator = this.getValidator(importType);
    const model = this.getModel(importType);

    const rows: any[] = await this.loadCSV(filePath);
    const totalRecords = rows.length;
    const errors: Record<number, string[]> = {};
    const docs: any[] = [];
    const duplicateSet = new Set<string>();
    let validRecords = 0;
    let skippedRecords = 0;
    let failedRecords = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const { valid, errors: rowErrors } = validator(row);
      if (!valid) {
        failedRecords++;
        errors[i + 1] = rowErrors; // CSV row numbers start at 1 after header
        continue;
      }
      // Build composite key for duplicate detection
      const key = this.getCompositeKey(importType, row);
      if (duplicateSet.has(key)) {
        skippedRecords++;
        continue;
      }
      duplicateSet.add(key);
      // Transform to mongoose doc shape (convert dates, numbers)
      const doc = this.transformRow(importType, row);
      docs.push(doc);
      validRecords++;
    }

    let importedRecords = 0;
    if (docs.length > 0) {
      try {
        const result = await model.insertMany(docs, { ordered: false });
        importedRecords = result.length;
      } catch (e: any) {
        // partial failure – some docs inserted, some errors
        if (e.result && typeof e.result.nInserted === 'number') {
          importedRecords = e.result.nInserted;
        }
        // capture bulkWrite errors if needed (omitted for brevity)
      }
    }

    const log = new ImportLog({
      importType,
      sourceFile: filename,
      startedAt: new Date(),
      endedAt: new Date(),
      totalRecords,
      validRecords,
      importedRecords,
      skippedRecords,
      failedRecords,
      status: importedRecords === 0 ? 'failed' : failedRecords > 0 ? 'partial' : 'completed',
    });
    await log.save();

    // file moving logic
    if (failedRecords === 0) {
      // move to processed regardless of duplicates (they are considered skipped)
      const dest = path.join(this.processedDir, `${importType}s`, filename);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.renameSync(filePath, dest);
    } else {
      // write error report
      const errPath = path.join(this.errorsDir, `${importType}_error_${Date.now()}.json`);
      fs.mkdirSync(path.dirname(errPath), { recursive: true });
      fs.writeFileSync(errPath, JSON.stringify({ filename, errors }, null, 2));
    }

    return { totalRecords, validRecords, importedRecords, skippedRecords, failedRecords, errors };
  }

  private getValidator(importType: string) {
    switch (importType) {
      case 'project':
        return validateProjectRow;
      case 'snapshot':
        return validateSnapshotRow;
      case 'outcome':
        return validateOutcomeRow;
      default:
        throw new Error('Unknown import type');
    }
  }

  private getModel(importType: string) {
    switch (importType) {
      case 'project':
        return Project;
      case 'snapshot':
        return ProjectSnapshot;
      case 'outcome':
        return ProjectOutcome;
      default:
        throw new Error('Unknown import type');
    }
  }

  private getCompositeKey(importType: string, row: any): string {
    if (importType === 'project') return row.projectCode;
    if (importType === 'snapshot') return `${row.projectCode}|${row.snapshotDate}|${row.reportType}`;
    if (importType === 'outcome') return `${row.projectCode}|${row.finalStatus}`;
    return '';
  }

  private transformRow(importType: string, row: any) {
    if (importType === 'project') {
      return {
        projectCode: row.projectCode.trim(),
        name: row.name.trim(),
        sector: row.sector,
        type: row.type,
        status: row.status ?? undefined,
        startDate: new Date(row.startDate),
        endDate: row.endDate ? new Date(row.endDate) : undefined,
        budget: Number(row.budget),
        description: row.description?.trim(),
        source: row.source?.trim(),
      };
    }
    if (importType === 'snapshot') {
      return {
        project: row.projectCode,
        snapshotDate: new Date(row.snapshotDate),
        reportType: row.reportType,
        percentComplete: Number(row.percentComplete),
        actualCost: Number(row.actualCost),
      };
    }
    if (importType === 'outcome') {
      return {
        project: row.projectCode,
        finalCost: Number(row.finalCost),
        finalStatus: row.finalStatus,
        completionDate: new Date(row.completionDate),
        notes: row.notes?.trim(),
      };
    }
    return {};
  }

  private loadCSV(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const records: any[] = [];
      fs.createReadStream(filePath)
        .pipe(csvParse({ columns: true, trim: true, skip_empty_lines: true }))
        .on('data', (row) => records.push(row))
        .on('end', () => resolve(records))
        .on('error', (err) => reject(err));
    });
  }
}
