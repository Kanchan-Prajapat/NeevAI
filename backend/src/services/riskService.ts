import { DerivedMetric, Project, ProjectSnapshot } from '../models';
import { derivedMetricFormulas } from '../constants/derivedMetricFormulas';
import { riskWeights } from '../constants/riskWeights';
import { clamp } from '../utils/clamp';

/**
 * Service that calculates individual risk components and aggregates them.
 * All calculations are pure functions; this service orchestrates the workflow.
 */
export class RiskService {
  /**
   * Compute all risk components for a project based on its snapshots.
   * Returns an object containing each numeric component (or null) and the aggregated result.
   */
  async computeRiskComponents(projectId: string) {
    // Load snapshots ordered chronologically
    const snapshots = await ProjectSnapshot.find({ project: projectId })
      .sort({ snapshotDate: 1 })
      .lean();

    if (snapshots.length < 2) {
      // Not enough data for velocity or schedule calculations
      return { components: {}, dataStatus: 'insufficient_data' as const };
    }

    const project = await Project.findById(projectId).lean();
    if (!project) throw new Error('Project not found');

    // Use the latest two snapshots for velocity calculation
    const latest = snapshots[snapshots.length - 1];
    const previous = snapshots[snapshots.length - 2];

    const physicalProgressCurrent = latest.physicalProgress ?? 0;
    const physicalProgressPrev = previous.physicalProgress ?? 0;
    const daysBetween = (latest.snapshotDate.getTime() - previous.snapshotDate.getTime()) / (1000 * 60 * 60 * 24);

    // ---- Derived metrics ---------------------------------------------------
    const financialProgress = derivedMetricFormulas.financialProgress(latest.actualCost ?? 0, project.budget ?? 0);
    const physicalProgress = derivedMetricFormulas.financialProgress(latest.physicalProgress ?? 0, 100); // placeholder, not used directly
    const costVariance = derivedMetricFormulas.costVariance(financialProgress, latest.physicalProgress ?? 0);
    const scheduleVariance = derivedMetricFormulas.scheduleVariance(
      project.endDate ?? new Date(),
      latest.actualCompletionDate ?? new Date(),
      (project.endDate?.getTime() ?? Date.now()) - (project.startDate?.getTime() ?? Date.now()),
    );
    const expectedVelocity = derivedMetricFormulas.expectedVelocity(project.totalPlannedProjectDays ?? 0);
    const actualVelocity = derivedMetricFormulas.actualVelocity(
      latest.physicalProgress ?? 0,
      previous.physicalProgress ?? 0,
      daysBetween,
    );

    // ---- Risk components ---------------------------------------------------
    const costRisk = derivedMetricFormulas.costRiskOngoing(costVariance);
    const scheduleRisk = clamp(-scheduleVariance, 0, 100);
    const velocityRisk = derivedMetricFormulas.velocityRisk(expectedVelocity, actualVelocity);
    const efficiencyRisk = derivedMetricFormulas.efficiencyRisk(financialProgress, latest.physicalProgress ?? 0);

    const components: Record<string, number | null> = {
      costRisk,
      scheduleRisk,
      velocityRisk,
      efficiencyRisk,
    };

    // Determine available components (exclude null values)
    const available = Object.entries(components).filter(([, v]) => v !== null && v !== undefined);
    const availableCount = available.length;

    let overallRiskScore: number | null = null;
    let riskLevel: string | null = null;
    let dataStatus: 'complete' | 'partial' | 'insufficient_data' = 'insufficient_data';

    if (availableCount >= 2) {
      let weightedSum = 0;
      let weightSum = 0;
      for (const [key, val] of available) {
        const weight = (riskWeights as any)[key] ?? 0;
        weightedSum += (val as number) * weight;
        weightSum += weight;
      }
      overallRiskScore = weightedSum / weightSum;
      // Determine risk level based on score thresholds
      if (overallRiskScore <= 25) riskLevel = 'Low';
      else if (overallRiskScore <= 50) riskLevel = 'Medium';
      else if (overallRiskScore <= 75) riskLevel = 'High';
      else riskLevel = 'Critical';

      dataStatus = availableCount === 4 ? 'complete' : 'partial';
    }

    return {
      components,
      overallRiskScore,
      riskLevel,
      dataStatus,
      // also return derived values for persisting if needed
      derived: {
        financialProgress,
        physicalProgress: latest.physicalProgress ?? 0,
        costVariance,
        scheduleVariance,
        expectedVelocity,
        actualVelocity,
        costRisk,
        scheduleRisk,
        velocityRisk,
        efficiencyRisk,
      },
    };
  }
}

export const riskService = new RiskService();
