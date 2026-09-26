import { useState } from "react";

import type { Project } from "../../../shared/types";

import "./AddProjectForm.css";

import { createProject } from "../services/projectService";

interface AddProjectFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

function AddProjectForm({
  onCancel,
  onSuccess,
}: AddProjectFormProps) {
  /* =========================================
     BASIC INFORMATION
  ========================================= */

  const [projectId, setProjectId] =
    useState("");

  const [projectName, setProjectName] =
    useState("");

  const [projectType, setProjectType] =
    useState("");

  const [domain, setDomain] =
    useState<Project["domain"]>(
      "Roads & Highways"
    );


  /* =========================================
     ORGANIZATION
  ========================================= */

  const [ministry, setMinistry] =
    useState("");

  const [implementingAgency, setImplementingAgency] =
    useState("");


  /* =========================================
     LOCATION
  ========================================= */

  const [state, setState] =
    useState("");

  const [districtOrLocation, setDistrictOrLocation] =
    useState("");


  /* =========================================
     PROJECT DATES
  ========================================= */

const [approvalDate, setApprovalDate] =
  useState("");

const [startDate, setStartDate] =
  useState("");

const [originalCompletionDate, setOriginalCompletionDate] =
  useState("");

  /* =========================================
     FINANCIAL
  ========================================= */

  const [originalCostCr, setOriginalCostCr] =
    useState("");


  /* =========================================
     SOURCE
  ========================================= */

  const [dataSource, setDataSource] =
    useState("");

  const [sourceProjectCode, setSourceProjectCode] =
    useState("");


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

    if (!projectId.trim()) {
      return "Project ID is required.";
    }

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


    try {

      setSubmitting(true);
      setError(null);
      setSuccess(false);


      const newProject:
        Omit<
          Project,
          "id" |
          "createdAt" |
          "updatedAt"
        > = {

        projectId:
          projectId.trim(),

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
      };


      await createProject(
        newProject
      );


      setSuccess(true);


      /*
       * Return to Projects page
       * after successful creation.
       */

      setTimeout(() => {
        onSuccess();
      }, 800);


    } catch (err) {

      console.error(
        "Failed to create project:",
        err
      );

      setError(
        "Failed to create project. Please try again."
      );

    } finally {

      setSubmitting(false);

    }
  };


  /* =========================================
     UI
  ========================================= */

  return (
    <div className="add-project-page">

      {/* =====================================
          HEADER
      ===================================== */}

      <div className="add-project-header">

        <div>

          <h2>
            Add New Project
          </h2>

          <p>
            Create the master record for an
            infrastructure project.
          </p>

        </div>


        <button
          className="back-button"
          type="button"
          onClick={onCancel}
          disabled={submitting}
        >
          ← Back to Projects
        </button>

      </div>


      <form
        className="add-project-form"
        onSubmit={handleSubmit}
      >

        {/* =====================================
            BASIC INFORMATION
        ===================================== */}

        <section className="form-section">

          <h3>
            Basic Information
          </h3>

          <p className="form-section-description">
            Enter the primary identity and classification
            of the infrastructure project.
          </p>


          <div className="form-grid">

            <div className="form-field">

              <label>
                Project ID
              </label>

              <input
                type="text"
                placeholder="e.g. PAIMANA_001"
                value={projectId}
                onChange={(e) =>
                  setProjectId(
                    e.target.value
                  )
                }
                required
              />

            </div>


            <div className="form-field">

              <label>
                Project Name
              </label>

              <input
                type="text"
                placeholder="Enter official project name"
                value={projectName}
                onChange={(e) =>
                  setProjectName(
                    e.target.value
                  )
                }
                required
              />

            </div>


            <div className="form-field">

              <label>
                Project Type
              </label>

              <input
                type="text"
                placeholder="e.g. Expressway, AIIMS, Railway"
                value={projectType}
                onChange={(e) =>
                  setProjectType(
                    e.target.value
                  )
                }
                required
              />

            </div>


            <div className="form-field">

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

        <section className="form-section">

          <h3>
            Organization
          </h3>

          <p className="form-section-description">
            Enter the ministry and agency responsible
            for implementing the project.
          </p>


          <div className="form-grid">

            <div className="form-field">

              <label>
                Ministry
              </label>

              <input
                type="text"
                placeholder="e.g. Ministry of Road Transport & Highways"
                value={ministry}
                onChange={(e) =>
                  setMinistry(
                    e.target.value
                  )
                }
                required
              />

            </div>


            <div className="form-field">

              <label>
                Implementing Agency
              </label>

              <input
                type="text"
                placeholder="e.g. NHAI"
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

        <section className="form-section">

          <h3>
            Location
          </h3>

          <p className="form-section-description">
            Enter the geographical location of the project.
          </p>


          <div className="form-grid">

            <div className="form-field">

              <label>
                State
              </label>

              <input
                type="text"
                placeholder="e.g. Rajasthan"
                value={state}
                onChange={(e) =>
                  setState(
                    e.target.value
                  )
                }
              />

            </div>


            <div className="form-field">

              <label>
                District / Location
              </label>

              <input
                type="text"
                placeholder="e.g. Jaipur / Ajmer Road"
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

        <section className="form-section">

          <h3>
            Project Planning
          </h3>

          <p className="form-section-description">
            Enter the original approved project
            timeline and cost baseline.
          </p>


          <div className="form-grid">

            <div className="form-field">

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


<div className="form-field">

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

            <div className="form-field">

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


            <div className="form-field">

              <label>
                Original Project Cost (₹ Cr)
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 1500"
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

        <section className="form-section">

          <h3>
            Data Source
          </h3>

          <p className="form-section-description">
            Record where the project master information
            came from for traceability.
          </p>


          <div className="form-grid">

            <div className="form-field">

              <label>
                Data Source
              </label>

              <input
                type="text"
                placeholder="e.g. PAIMANA"
                value={dataSource}
                onChange={(e) =>
                  setDataSource(
                    e.target.value
                  )
                }
                required
              />

            </div>


            <div className="form-field">

              <label>
                Source Project Code
              </label>

              <input
                type="text"
                placeholder="Official source project code"
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

        <div className="form-actions">

          <button
            type="button"
            className="cancel-button"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>


          <button
            type="submit"
            className="submit-button"
            disabled={submitting}
          >

            {submitting
              ? "Creating Project..."
              : "Create Project"}

          </button>

        </div>

      </form>


      {/* =====================================
          SUCCESS
      ===================================== */}

      {success && (
        <div className="success-message">
          ✓ Project created successfully!
        </div>
      )}


      {/* =====================================
          ERROR
      ===================================== */}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

    </div>
  );
}


export default AddProjectForm;