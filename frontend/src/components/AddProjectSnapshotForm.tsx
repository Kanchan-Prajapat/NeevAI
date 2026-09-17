import {
  FormEvent,
  useState,
} from "react";

import type {
  Project,
  ProjectSnapshot,
} from "../../../shared/types";

import {
  createProjectSnapshot,
} from "../services/projectSnapshotService";

import "./AddProjectSnapshotForm.css";

interface AddProjectSnapshotFormProps {
  project: Project;
  onCancel: () => void;
  onSuccess: () => void;
}

const AddProjectSnapshotForm = ({
  project,
  onCancel,
  onSuccess,
}: AddProjectSnapshotFormProps) => {
  const [formData, setFormData] = useState({
    reportType: "Monthly" as ProjectSnapshot["reportType"],
    reportPeriod: "",
    reportDate: "",

    originalCostCr:
      project.originalCostCr?.toString() ?? "",

    revisedCostCr: "",
    anticipatedCostCr: "",
     cumulativeExpenditureCr: "",
    physicalProgressPct: "",

    // ML / project execution inputs
    totalMilestones: "",
    completedMilestones: "",
    delayedMilestones: "",

    landAcquisitionDelayMonths: "",
    clearanceDelayMonths: "",

    contractorDelayScore: "",
    geologicalDelayScore: "",

    healthStatus:
      "Unknown" as ProjectSnapshot["healthStatus"],

    originalCompletionDate:
      typeof project.originalCompletionDate === "string"
        ? project.originalCompletionDate
        : "",

    revisedCompletionDate: "",
    anticipatedCompletionDate: "",

    projectStatus: "",
    remarks: "",

    sourceReport:
      project.dataSource || "",

    sourcePage: "",
  });

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState(false);

  const handleChange = (
    field: keyof typeof formData,
    value: string
  ) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const parseNumber = (
    value: string
  ): number | null => {
    if (value.trim() === "") {
      return null;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : null;
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError(null);
    setSuccess(false);

    if (!formData.reportPeriod.trim()) {
      setError("Report period is required.");
      return;
    }

    if (!formData.reportDate) {
      setError("Report date is required.");
      return;
    }

    if (!formData.sourceReport.trim()) {
      setError("Source report is required.");
      return;
    }

    const physicalProgress =
      parseNumber(
        formData.physicalProgressPct
      );

    if (
      physicalProgress !== null &&
      (physicalProgress < 0 ||
        physicalProgress > 100)
    ) {
      setError(
        "Physical progress must be between 0 and 100."
      );
      return;
    }

        const totalMilestones =
      parseNumber(formData.totalMilestones);

    const completedMilestones =
      parseNumber(formData.completedMilestones);

    const delayedMilestones =
      parseNumber(formData.delayedMilestones);

    const landAcquisitionDelayMonths =
      parseNumber(
        formData.landAcquisitionDelayMonths
      );

    const clearanceDelayMonths =
      parseNumber(
        formData.clearanceDelayMonths
      );

    const contractorDelayScore =
      parseNumber(
        formData.contractorDelayScore
      );

    const geologicalDelayScore =
      parseNumber(
        formData.geologicalDelayScore
      );

    if (totalMilestones === null) {
      setError("Total milestones are required.");
      return;
    }

    if (completedMilestones === null) {
      setError(
        "Completed milestones are required."
      );
      return;
    }

    if (delayedMilestones === null) {
      setError(
        "Delayed milestones are required."
      );
      return;
    }

if (totalMilestones <= 0) {
  setError(
    "Total milestones must be greater than 0."
  );
  return;
}

    if (
      completedMilestones < 0 ||
      completedMilestones > totalMilestones
    ) {
      setError(
        "Completed milestones must be between 0 and total milestones."
      );
      return;
    }

    if (
      delayedMilestones < 0 ||
      delayedMilestones > totalMilestones
    ) {
      setError(
        "Delayed milestones must be between 0 and total milestones."
      );
      return;
    }

    if (
      landAcquisitionDelayMonths !== null &&
      landAcquisitionDelayMonths < 0
    ) {
      setError(
        "Land acquisition delay cannot be negative."
      );
      return;
    }

    if (
      clearanceDelayMonths !== null &&
      clearanceDelayMonths < 0
    ) {
      setError(
        "Clearance delay cannot be negative."
      );
      return;
    }

    if (
      contractorDelayScore !== null &&
      contractorDelayScore < 0
    ) {
      setError(
        "Contractor delay score cannot be negative."
      );
      return;
    }

    if (
      geologicalDelayScore !== null &&
      geologicalDelayScore < 0
    ) {
      setError(
        "Geological delay score cannot be negative."
      );
      return;
    }

    try {
      setSaving(true);

      const snapshot: Omit<
        ProjectSnapshot,
        "id" | "createdAt" | "updatedAt"
      > = {
        projectId: project.projectId,

        reportType:
          formData.reportType,

        reportPeriod:
          formData.reportPeriod.trim(),

        reportDate:
          formData.reportDate,

        originalCostCr:
          parseNumber(
            formData.originalCostCr
          ),

        revisedCostCr:
          parseNumber(
            formData.revisedCostCr
          ),

        anticipatedCostCr:
          parseNumber(
            formData.anticipatedCostCr
          ),

        cumulativeExpenditureCr:
          parseNumber(
            formData.cumulativeExpenditureCr
          ),

             physicalProgressPct:
          physicalProgress,

        // ML / project execution inputs
        totalMilestones:
          totalMilestones,

        completedMilestones:
          completedMilestones,

        delayedMilestones:
          delayedMilestones,

        landAcquisitionDelayMonths:
          landAcquisitionDelayMonths,

        clearanceDelayMonths:
          clearanceDelayMonths,

        contractorDelayScore:
          contractorDelayScore,

        geologicalDelayScore:
          geologicalDelayScore,

        healthStatus:
          formData.healthStatus,

        originalCompletionDate:
          formData.originalCompletionDate ||
          null,

        revisedCompletionDate:
          formData.revisedCompletionDate ||
          null,

        anticipatedCompletionDate:
          formData.anticipatedCompletionDate ||
          null,

      projectStatus:
  formData.projectStatus.trim() ||
  "",

remarks:
  formData.remarks.trim() ||
  "",

        sourceReport:
          formData.sourceReport.trim(),

        sourcePage:
          formData.sourcePage.trim() || null,
      };

      await createProjectSnapshot(
        snapshot
      );

      setSuccess(true);

      onSuccess();
    } catch (err) {
      console.error(
        "Failed to create project snapshot:",
        err
      );

      setError(
        "Failed to save project snapshot. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="snapshot-form-page">
      <div className="snapshot-form-container">

        {/* HEADER */}
        <div className="snapshot-form-header">

          <div>
            <h2>
              Add Project Snapshot
            </h2>

            <p>
              Add a reporting-period snapshot
              for this project.
            </p>
          </div>

          <div className="snapshot-project-info">
            <span>
              {project.projectName}
            </span>

            <small>
              {project.projectId}
            </small>
          </div>

        </div>

        {/* ERROR */}
        {error && (
          <div className="snapshot-form-error">
            {error}
          </div>
        )}

        {/* SUCCESS */}
        {success && (
          <div className="snapshot-form-success">
            Snapshot saved successfully.
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="snapshot-form"
        >

          {/* =========================
              REPORTING INFORMATION
          ========================== */}

          <section className="snapshot-form-section">

            <div className="snapshot-section-header">
              <h3>
                Reporting Information
              </h3>

              <p>
                Identify the reporting period
                represented by this snapshot.
              </p>
            </div>

            <div className="snapshot-form-grid">

              <div className="snapshot-field">
                <label>
                  Report Type
                </label>

                <select
                  value={formData.reportType}
                  onChange={(event) =>
                    handleChange(
                      "reportType",
                      event.target.value
                    )
                  }
                >
                  <option value="Monthly">
                    Monthly
                  </option>

                  <option value="Quarterly">
                    Quarterly
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>

              <div className="snapshot-field">
                <label>
                  Report Period
                  <span className="required">
                    *
                  </span>
                </label>

                <input
                  type="text"
                  placeholder="e.g. July 2026"
                  value={
                    formData.reportPeriod
                  }
                  onChange={(event) =>
                    handleChange(
                      "reportPeriod",
                      event.target.value
                    )
                  }
                  required
                />
              </div>

              <div className="snapshot-field">
                <label>
                  Report Date
                  <span className="required">
                    *
                  </span>
                </label>

                <input
                  type="date"
                  value={
                    formData.reportDate
                  }
                  onChange={(event) =>
                    handleChange(
                      "reportDate",
                      event.target.value
                    )
                  }
                  required
                />
              </div>

            </div>
          </section>

          {/* =========================
              FINANCIAL PERFORMANCE
          ========================== */}

          <section className="snapshot-form-section">

            <div className="snapshot-section-header">
              <h3>
                Financial Performance
              </h3>

              <p>
                All monetary values are recorded
                in ₹ Crore.
              </p>
            </div>

            <div className="snapshot-form-grid">

              <div className="snapshot-field">
                <label>
                  Original Cost (₹ Cr)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 1500"
                  value={
                    formData.originalCostCr
                  }
                  onChange={(event) =>
                    handleChange(
                      "originalCostCr",
                      event.target.value
                    )
                  }
                />
              </div>

              <div className="snapshot-field">
                <label>
                  Revised Cost (₹ Cr)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Leave blank if unavailable"
                  value={
                    formData.revisedCostCr
                  }
                  onChange={(event) =>
                    handleChange(
                      "revisedCostCr",
                      event.target.value
                    )
                  }
                />
              </div>

              <div className="snapshot-field">
                <label>
                  Anticipated Cost (₹ Cr)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Leave blank if unavailable"
                  value={
                    formData.anticipatedCostCr
                  }
                  onChange={(event) =>
                    handleChange(
                      "anticipatedCostCr",
                      event.target.value
                    )
                  }
                />
              </div>

              <div className="snapshot-field">
                <label>
                  Cumulative Expenditure (₹ Cr)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 725.50"
                  value={
                    formData.cumulativeExpenditureCr
                  }
                  onChange={(event) =>
                    handleChange(
                      "cumulativeExpenditureCr",
                      event.target.value
                    )
                  }
                />
              </div>

            </div>
          </section>

          {/* =========================
              PHYSICAL PROGRESS
          ========================== */}

          <section className="snapshot-form-section">

            <div className="snapshot-section-header">
              <h3>
                Physical Progress
              </h3>

              <p>
                Record the actual physical
                progress reported for this period.
              </p>
            </div>

            <div className="snapshot-form-grid">

              <div className="snapshot-field">
                <label>
                  Physical Progress (%)
                </label>

                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="e.g. 62.5"
                  value={
                    formData.physicalProgressPct
                  }
                  onChange={(event) =>
                    handleChange(
                      "physicalProgressPct",
                      event.target.value
                    )
                  }
                />
              </div>

              <div className="snapshot-field">
                <label>
                  Health Status
                </label>

                <select
                  value={
                    formData.healthStatus
                  }
                  onChange={(event) =>
                    handleChange(
                      "healthStatus",
                      event.target.value
                    )
                  }
                >
                  <option value="Healthy">
                    Healthy
                  </option>

                  <option value="Warning">
                    Warning
                  </option>

                  <option value="Critical">
                    Critical
                  </option>

                  <option value="Unknown">
                    Unknown
                  </option>
                </select>
              </div>

            </div>
          </section>


                    {/* =========================
              EXECUTION & ML INPUTS
          ========================== */}

          <section className="snapshot-form-section">

            <div className="snapshot-section-header">
              <h3>
                Execution & ML Inputs
              </h3>

              <p>
                Record project execution metrics
                reported for this snapshot.
              </p>
            </div>

            <div className="snapshot-form-grid">

              <div className="snapshot-field">
                <label>
                  Total Milestones
                  <span className="required">
                    *
                  </span>
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 40"
                  value={
                    formData.totalMilestones
                  }
                  onChange={(event) =>
                    handleChange(
                      "totalMilestones",
                      event.target.value
                    )
                  }
                  required
                />
              </div>

              <div className="snapshot-field">
                <label>
                  Completed Milestones
                  <span className="required">
                    *
                  </span>
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 25"
                  value={
                    formData.completedMilestones
                  }
                  onChange={(event) =>
                    handleChange(
                      "completedMilestones",
                      event.target.value
                    )
                  }
                  required
                />
              </div>

              <div className="snapshot-field">
                <label>
                  Delayed Milestones
                  <span className="required">
                    *
                  </span>
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 5"
                  value={
                    formData.delayedMilestones
                  }
                  onChange={(event) =>
                    handleChange(
                      "delayedMilestones",
                      event.target.value
                    )
                  }
                  required
                />
              </div>

              <div className="snapshot-field">
                <label>
                  Land Acquisition Delay (Months)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="e.g. 2.5"
                  value={
                    formData.landAcquisitionDelayMonths
                  }
                  onChange={(event) =>
                    handleChange(
                      "landAcquisitionDelayMonths",
                      event.target.value
                    )
                  }
                />
              </div>

              <div className="snapshot-field">
                <label>
                  Clearance Delay (Months)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="e.g. 1.5"
                  value={
                    formData.clearanceDelayMonths
                  }
                  onChange={(event) =>
                    handleChange(
                      "clearanceDelayMonths",
                      event.target.value
                    )
                  }
                />
              </div>

              <div className="snapshot-field">
                <label>
                  Contractor Delay Score
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="Enter reported score"
                  value={
                    formData.contractorDelayScore
                  }
                  onChange={(event) =>
                    handleChange(
                      "contractorDelayScore",
                      event.target.value
                    )
                  }
                />
              </div>

              <div className="snapshot-field">
                <label>
                  Geological Delay Score
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="Enter reported score"
                  value={
                    formData.geologicalDelayScore
                  }
                  onChange={(event) =>
                    handleChange(
                      "geologicalDelayScore",
                      event.target.value
                    )
                  }
                />
              </div>

            </div>
          </section>

          {/* =========================
              PROJECT SCHEDULE
          ========================== */}

          <section className="snapshot-form-section">

            <div className="snapshot-section-header">
              <h3>
                Project Schedule
              </h3>

              <p>
                Record completion dates reported
                in the selected snapshot.
              </p>
            </div>

            <div className="snapshot-form-grid">

              <div className="snapshot-field">
                <label>
                  Original Completion Date
                </label>

                <input
                  type="date"
                  value={
                    formData.originalCompletionDate
                  }
                  onChange={(event) =>
                    handleChange(
                      "originalCompletionDate",
                      event.target.value
                    )
                  }
                />
              </div>

              <div className="snapshot-field">
                <label>
                  Revised Completion Date
                </label>

                <input
                  type="date"
                  value={
                    formData.revisedCompletionDate
                  }
                  onChange={(event) =>
                    handleChange(
                      "revisedCompletionDate",
                      event.target.value
                    )
                  }
                />
              </div>

              <div className="snapshot-field">
                <label>
                  Anticipated Completion Date
                </label>

                <input
                  type="date"
                  value={
                    formData.anticipatedCompletionDate
                  }
                  onChange={(event) =>
                    handleChange(
                      "anticipatedCompletionDate",
                      event.target.value
                    )
                  }
                />
              </div>

            </div>
          </section>

          {/* =========================
              PROJECT STATUS
          ========================== */}

          <section className="snapshot-form-section">

            <div className="snapshot-section-header">
              <h3>
                Project Status
              </h3>

              <p>
                Record the status reported for
                this reporting period.
              </p>
            </div>

            <div className="snapshot-form-grid">

              <div className="snapshot-field">
                <label>
                  Project Status
                </label>

                <input
                  type="text"
                  placeholder="e.g. Ongoing"
                  value={
                    formData.projectStatus
                  }
                  onChange={(event) =>
                    handleChange(
                      "projectStatus",
                      event.target.value
                    )
                  }
                />
              </div>

            </div>
          </section>

          {/* =========================
              SOURCE INFORMATION
          ========================== */}

          <section className="snapshot-form-section">

            <div className="snapshot-section-header">
              <h3>
                Data Source
              </h3>

              <p>
                Keep the original government report
                reference for traceability.
              </p>
            </div>

            <div className="snapshot-form-grid">

              <div className="snapshot-field">
                <label>
                  Source Report
                  <span className="required">
                    *
                  </span>
                </label>

                <input
                  type="text"
                  placeholder="e.g. PAIMANA July 2026 Flash Report"
                  value={
                    formData.sourceReport
                  }
                  onChange={(event) =>
                    handleChange(
                      "sourceReport",
                      event.target.value
                    )
                  }
                  required
                />
              </div>

              <div className="snapshot-field">
                <label>
                  Source Page
                </label>

                <input
                  type="text"
                  placeholder="e.g. 12"
                  value={
                    formData.sourcePage
                  }
                  onChange={(event) =>
                    handleChange(
                      "sourcePage",
                      event.target.value
                    )
                  }
                />
              </div>

            </div>
          </section>

          {/* =========================
              REMARKS
          ========================== */}

          <section className="snapshot-form-section">

            <div className="snapshot-section-header">
              <h3>
                Remarks
              </h3>
            </div>

            <div className="snapshot-field full-width">

              <label>
                Remarks
              </label>

              <textarea
                rows={5}
                placeholder="Enter any remarks reported in the source..."
                value={
                  formData.remarks
                }
                onChange={(event) =>
                  handleChange(
                    "remarks",
                    event.target.value
                  )
                }
              />

            </div>
          </section>

          {/* =========================
              ACTIONS
          ========================== */}

          <div className="snapshot-form-actions">

            <button
              type="button"
              className="snapshot-cancel-button"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="snapshot-save-button"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save Snapshot"}
            </button>

          </div>

        </form>
      </div>
    </div>
  );
};

export default AddProjectSnapshotForm;