import { useState } from "react";

import type { Project } from "../../../shared/types";

import {
  updateProject,
} from "../services/projectService";

import "./EditProjectForm.css";

interface EditProjectFormProps {
  project: Project;
  onCancel: () => void;
  onSuccess: () => void;
}

function EditProjectForm({
  project,
  onCancel,
  onSuccess,
}: EditProjectFormProps) {

  /* =========================================
     BASIC INFORMATION
  ========================================= */

  const [projectName, setProjectName] =
    useState(project.projectName ?? "");

  const [projectType, setProjectType] =
    useState(project.projectType ?? "");

  const [domain, setDomain] =
    useState<Project["domain"]>(
      project.domain
    );


  /* =========================================
     ORGANIZATION
  ========================================= */

  const [ministry, setMinistry] =
    useState(project.ministry ?? "");

  const [implementingAgency, setImplementingAgency] =
    useState(
      project.implementingAgency ?? ""
    );


  /* =========================================
     LOCATION
  ========================================= */

  const [state, setState] =
    useState(project.state ?? "");

  const [districtOrLocation, setDistrictOrLocation] =
    useState(
      project.districtOrLocation ?? ""
    );


  /* =========================================
     PROJECT PLANNING
  ========================================= */

  const [approvalDate, setApprovalDate] =
    useState(
      typeof project.approvalDate === "string"
        ? project.approvalDate
        : ""
    );

const [startDate, setStartDate] =
  useState(
    typeof project.startDate === "string"
      ? project.startDate
      : ""
  );


  const [originalCompletionDate, setOriginalCompletionDate] =
    useState(
      typeof project.originalCompletionDate === "string"
        ? project.originalCompletionDate
        : ""
    );


  /* =========================================
     FINANCIAL
  ========================================= */

  const [originalCostCr, setOriginalCostCr] =
    useState(
      project.originalCostCr?.toString() ?? ""
    );


  /* =========================================
     SOURCE
  ========================================= */

  const [dataSource, setDataSource] =
    useState(project.dataSource ?? "");

  const [sourceProjectCode, setSourceProjectCode] =
    useState(
      project.sourceProjectCode ?? ""
    );


  /* =========================================
     FORM STATE
  ========================================= */

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState(false);


  /* =========================================
     VALIDATION
  ========================================= */

  const validateForm = (): string | null => {

    if (!projectName.trim()) {
      return "Project name is required.";
    }

    if (!projectType.trim()) {
      return "Project type is required.";
    }

    if (!ministry.trim()) {
      return "Ministry is required.";
    }

    if (!implementingAgency.trim()) {
      return "Implementing agency is required.";
    }

    if (!approvalDate) {
      return "Approval date is required.";
    }

    if (!startDate) {
  return "Project start date is required.";
}

    if (!originalCompletionDate) {
      return "Original completion date is required.";
    }

    if (!originalCostCr) {
      return "Original project cost is required.";
    }

    const costValue =
      Number(originalCostCr);

    if (
      Number.isNaN(costValue) ||
      costValue < 0
    ) {
      return "Please enter a valid original project cost.";
    }

    if (!dataSource.trim()) {
      return "Data source is required.";
    }

    return null;
  };


  /* =========================================
     SUBMIT
  ========================================= */

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {

    e.preventDefault();

    setError(null);
    setSuccess(false);


    const validationError =
      validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }


    if (!project.id) {
      setError(
        "Project document ID is missing."
      );
      return;
    }


    try {

      setSubmitting(true);
      setError(null);
      setSuccess(false);


      await updateProject(
        project.id,
        {
          projectName:
            projectName.trim(),

          domain,

          projectType:
            projectType.trim(),

          ministry:
            ministry.trim(),

          implementingAgency:
            implementingAgency.trim(),

          state:
            state.trim() || undefined,

          districtOrLocation:
            districtOrLocation.trim() ||
            undefined,
approvalDate:
  approvalDate,

startDate:
  startDate,

originalCostCr:
  Number(originalCostCr),

          originalCompletionDate:
            originalCompletionDate,

          dataSource:
            dataSource.trim(),

          sourceProjectCode:
            sourceProjectCode.trim() ||
            undefined,
        }
      );


      setSuccess(true);


      setTimeout(() => {
        onSuccess();
      }, 800);


    } catch (err) {

      console.error(
        "Failed to update project:",
        err
      );

      setError(
        "Failed to update project. Please try again."
      );

    } finally {

      setSubmitting(false);

    }
  };


  /* =========================================
     UI
  ========================================= */

  return (
    <div className="edit-project-page">

      {/* =====================================
          HEADER
      ===================================== */}

      <div className="edit-project-header">

        <div>

          <h1>
            Edit Project
          </h1>

          <p>
            Update project master information.
          </p>

        </div>


        <button
          type="button"
          className="edit-cancel-button"
          onClick={onCancel}
          disabled={submitting}
        >
          ← Cancel
        </button>

      </div>


      <form
        className="edit-project-form"
        onSubmit={handleSubmit}
      >

        {/* =====================================
            BASIC INFORMATION
        ===================================== */}

        <section className="edit-form-card">

          <h2>
            Basic Information
          </h2>


          <div className="edit-form-grid">

            <div className="edit-form-group">

              <label>
                Project ID
              </label>

              <input
                type="text"
                value={project.projectId}
                disabled
              />

            </div>


            <div className="edit-form-group">

              <label>
                Project Name
              </label>

              <input
                type="text"
                value={projectName}
                onChange={(e) =>
                  setProjectName(
                    e.target.value
                  )
                }
                required
              />

            </div>


            <div className="edit-form-group">

              <label>
                Project Type
              </label>

              <input
                type="text"
                value={projectType}
                onChange={(e) =>
                  setProjectType(
                    e.target.value
                  )
                }
                required
              />

            </div>


            <div className="edit-form-group">

              <label>
                Domain
              </label>

              <select
                value={domain}
                onChange={(e) =>
                  setDomain(
                    e.target.value as Project["domain"]
                  )
                }
              >

                <option value="Roads & Highways">
                  Roads & Highways
                </option>

                <option value="Healthcare">
                  Healthcare
                </option>

              </select>

            </div>

          </div>

        </section>


        {/* =====================================
            ORGANIZATION
        ===================================== */}

        <section className="edit-form-card">

          <h2>
            Organization
          </h2>


          <div className="edit-form-grid">

            <div className="edit-form-group">

              <label>
                Ministry
              </label>

              <input
                type="text"
                value={ministry}
                onChange={(e) =>
                  setMinistry(
                    e.target.value
                  )
                }
                required
              />

            </div>


            <div className="edit-form-group">

              <label>
                Implementing Agency
              </label>

              <input
                type="text"
                value={implementingAgency}
                onChange={(e) =>
                  setImplementingAgency(
                    e.target.value
                  )
                }
                required
              />

            </div>

          </div>

        </section>


        {/* =====================================
            LOCATION
        ===================================== */}

        <section className="edit-form-card">

          <h2>
            Location
          </h2>


          <div className="edit-form-grid">

            <div className="edit-form-group">

              <label>
                State
              </label>

              <input
                type="text"
                value={state}
                onChange={(e) =>
                  setState(
                    e.target.value
                  )
                }
              />

            </div>


            <div className="edit-form-group">

              <label>
                District / Location
              </label>

              <input
                type="text"
                value={districtOrLocation}
                onChange={(e) =>
                  setDistrictOrLocation(
                    e.target.value
                  )
                }
              />

            </div>

          </div>

        </section>


        {/* =====================================
            PROJECT PLANNING
        ===================================== */}

        <section className="edit-form-card">

          <h2>
            Project Planning
          </h2>


          <div className="edit-form-grid">

            <div className="edit-form-group">

              <label>
                Approval Date
              </label>

              <input
                type="date"
                value={approvalDate}
                onChange={(e) =>
                  setApprovalDate(
                    e.target.value
                  )
                }
                required
              />

            </div>

            <div className="edit-form-group">
  <label>
    Project Start Date
  </label>

  <input
    type="date"
    value={startDate}
    onChange={(e) =>
      setStartDate(
        e.target.value
      )
    }
    required
  />
</div>


            <div className="edit-form-group">

              <label>
                Original Completion Date
              </label>

              <input
                type="date"
                value={originalCompletionDate}
                onChange={(e) =>
                  setOriginalCompletionDate(
                    e.target.value
                  )
                }
                required
              />

            </div>


            <div className="edit-form-group">

              <label>
                Original Project Cost (₹ Cr)
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={originalCostCr}
                onChange={(e) =>
                  setOriginalCostCr(
                    e.target.value
                  )
                }
                required
              />

            </div>

          </div>

        </section>


        {/* =====================================
            DATA SOURCE
        ===================================== */}

        <section className="edit-form-card">

          <h2>
            Data Source
          </h2>


          <div className="edit-form-grid">

            <div className="edit-form-group">

              <label>
                Data Source
              </label>

              <input
                type="text"
                value={dataSource}
                onChange={(e) =>
                  setDataSource(
                    e.target.value
                  )
                }
                required
              />

            </div>


            <div className="edit-form-group">

              <label>
                Source Project Code
              </label>

              <input
                type="text"
                value={sourceProjectCode}
                onChange={(e) =>
                  setSourceProjectCode(
                    e.target.value
                  )
                }
              />

            </div>

          </div>

        </section>


        {/* =====================================
            ACTIONS
        ===================================== */}

        <div className="edit-form-actions">

          <button
            type="button"
            className="edit-cancel-button"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>


          <button
            type="submit"
            className="save-project-button"
            disabled={submitting}
          >

            {submitting
              ? "Saving Changes..."
              : "Save Changes"}

          </button>

        </div>


        {/* =====================================
            SUCCESS
        ===================================== */}

        {success && (

          <div className="edit-success-message">

            ✅ Project updated successfully!

          </div>

        )}


        {/* =====================================
            ERROR
        ===================================== */}

        {error && (

          <div className="edit-error-message">

            ❌ {error}

          </div>

        )}

      </form>

    </div>
  );
}


export default EditProjectForm;