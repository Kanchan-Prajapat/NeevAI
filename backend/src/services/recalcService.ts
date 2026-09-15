import { Project, ProjectSnapshot, DerivedMetric, RecalcLog } from '../models';
import { derivedMetricFormulas } from '../constants/derivedMetricFormulas';
import { riskService } from './riskService';
import { clamp } from '../utils/clamp';

/**
 * Service responsible for explicit analytics recalculation.
 * It computes derived metrics, persists them, calculates overall risk, and logs the operation.
 */
export class RecalcService {
  /**
   * Recalculate analytics for a given project.
   * Returns the persisted DerivedMetric document (or null if not created) and risk info.
   */
  async recalculate(projectId: string) {
    const log = new RecalcLog({
      project: projectId,
      status: 'started',
      startedAt: new Date(),
    });
    await log.save();

    try {
      // Load project and its snapshots
      const project = await Project.findById(projectId).lean();
      if (!project) throw new Error('Project not found');

      const snapshots = await ProjectSnapshot.find({ project: projectId })
        .sort({ snapshotDate: 1 })
        .lean();

      // Use riskService to compute components and derived values
      const riskResult = await riskService.computeRiskComponents(projectId);

      // Persist derived metrics (as a single document for simplicity)
      const derived = riskResult.derived || {};
      const analytics = await DerivedMetric.findOneAndUpdate(
        { project: projectId, metricName: 'analytics' },
        {
          project: projectId,
          metricName: 'analytics',
          value: derived.costVariance ?? 0, // placeholder; actual value not used directly
          calculatedAt: new Date(),
          financialProgress: derived.financialProgress,
          physicalProgress: derived.physicalProgress,
          costVariance: derived.costVariance,
          expectedVelocity: derived.expectedVelocity,
          actualVelocity: derived.actualVelocity,
          scheduleVariance: derived.scheduleVariance,
          overallRiskScore: riskResult.overallRiskScore ?? undefined,
          riskLevel: riskResult.riskLevel ?? undefined,
          computedAt: new Date(),
        },
        { upsert: true, new: true },
      ).lean();

      // Update log as completed
      log.status = 'completed';
      log.endedAt = new Date();
      log.computedAt = new Date();
      await log.save();

      return { analytics, risk: riskResult };
    } catch (err: any) {
      log.status = 'failed';
      log.endedAt = new Date();
      log.errorMessage = err.message;
      await log.save();
      throw err;
    }
  }
}

export const recalcService = new RecalcService();
