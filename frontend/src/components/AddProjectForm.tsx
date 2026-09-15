import { useState } from "react";

import type { Project } from "../../../shared/types/project";

import type {
  ProjectType,
  ProjectStatus,
  Sectors,
} from "../../../shared/constants";

import {
  PROJECT_TYPES,
  PROJECT_STATUSES,
  SECTORS,
} from "../../../shared/constants";
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
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

const [projectType, setProjectType] =
  useState<ProjectType>(PROJECT_TYPES.ROAD);

const [sector, setSector] =
  useState<Sectors>(SECTORS[0]);

const [status, setStatus] =
  useState<ProjectStatus>(PROJECT_STATUSES[0]);

  const [implementingAgency, setImplementingAgency] = useState("");

  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");

  const [budget, setBudget] = useState("");
  const [expenditure, setExpenditure] = useState("");

  const [progressPercentage, setProgressPercentage] = useState("");


  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);


  const validateForm = (): string | null => {
  if (!projectId.trim()) {
    return "Project ID is required.";
  }

  if (!name.trim()) {
    return "Project name is required.";
  }

  if (!implementingAgency.trim()) {
    return "Implementing agency is required.";
  }

  const budgetValue = Number(budget);
  const expenditureValue = Number(expenditure);
  const progressValue = Number(progressPercentage);

  if (
    !budget ||
    Number.isNaN(budgetValue) ||
    budgetValue < 0
  ) {
    return "Please enter a valid total budget.";
  }

  if (
    !expenditure ||
    Number.isNaN(expenditureValue) ||
    expenditureValue < 0
  ) {
    return "Please enter a valid expenditure.";
  }

  if (expenditureValue > budgetValue) {
    return "Current expenditure cannot exceed the total budget.";
  }

  if (
    !progressPercentage ||
    Number.isNaN(progressValue) ||
    progressValue < 0 ||
    progressValue > 100
  ) {
    return "Progress percentage must be between 0 and 100.";
  }

  return null;
};



const handleSubmit = async (
  e: React.FormEvent<HTMLFormElement>
) => {
  e.preventDefault();

  setError(null);
  setSuccess(false);

  const validationError = validateForm();

  if (validationError) {
    setError(validationError);
    return;
  }

  try {
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const newProject: Omit<Project, "id"> = {
     projectId: projectId.trim(),

name: name.trim(),

description: description.trim(),

      projectType,
      sector,

     implementingAgency:
  implementingAgency.trim(),

 location: {
  state: state.trim(),
  district: district.trim(),
  city: city.trim(),
},

      budget: Number(budget),
      expenditure: Number(expenditure),

      progressPercentage:
        Number(progressPercentage),

      status,
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


 return (
  <div className="add-project-page">

    <div className="add-project-header">

      <div>
        <h2>Add New Project</h2>

        <p>
          Create a new infrastructure project and add its initial information.
        </p>
      </div>

      <button
        className="back-button"
        type="button"
        onClick={onCancel}
      >
        ← Back to Projects
      </button>

    </div>


    <form
      className="add-project-form"
      onSubmit={handleSubmit}
    >

      {/* BASIC INFORMATION */}

      <section className="form-section">

        <h3>Basic Information</h3>

        <p className="form-section-description">
          Enter the primary details of the project.
        </p>


        <div className="form-grid">

          <div className="form-field">

            <label>
              Project ID
            </label>

            <input
              type="text"
              placeholder="e.g. NeevAI_001"
              value={projectId}
              onChange={(e) =>
                setProjectId(e.target.value)
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
              placeholder="Enter project name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              required
            />

          </div>


          <div className="form-field full-width">

            <label>
              Project Description
            </label>

            <textarea
              placeholder="Describe the project..."
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
            />

          </div>

        </div>

      </section>


      {/* CLASSIFICATION */}

      <section className="form-section">

        <h3>Classification</h3>

        <p className="form-section-description">
          Define the type, sector and current status.
        </p>


        <div className="form-grid">

          <div className="form-field">

            <label>
              Project Type
            </label>

            <select
              value={projectType}
              onChange={(e) =>
                setProjectType(
                  e.target.value as ProjectType
                )
              }
            >
              {Object.values(PROJECT_TYPES).map(
                (type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>
                )
              )}
            </select>

          </div>


          <div className="form-field">

            <label>
              Sector
            </label>

            <select
              value={sector}
              onChange={(e) =>
                setSector(
                  e.target.value as Sectors
                )
              }
            >
              {SECTORS.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>

          </div>


          <div className="form-field">

            <label>
              Project Status
            </label>

            <select
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value as ProjectStatus
                )
              }
            >
              {PROJECT_STATUSES.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>

          </div>

        </div>

      </section>


      {/* ORGANIZATION */}

      <section className="form-section">

        <h3>Organization</h3>

        <p className="form-section-description">
          Enter the organization responsible for implementing this project.
        </p>


        <div className="form-grid">

          <div className="form-field full-width">

            <label>
              Implementing Agency
            </label>

            <input
              type="text"
              placeholder="e.g. National Highways Authority"
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


      {/* LOCATION */}

      <section className="form-section">

        <h3>Location</h3>

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
              placeholder="State"
              value={state}
              onChange={(e) =>
                setState(e.target.value)
              }
            />

          </div>


          <div className="form-field">

            <label>
              District
            </label>

            <input
              type="text"
              placeholder="District"
              value={district}
              onChange={(e) =>
                setDistrict(e.target.value)
              }
            />

          </div>


          <div className="form-field">

            <label>
              City
            </label>

            <input
              type="text"
              placeholder="City"
              value={city}
              onChange={(e) =>
                setCity(e.target.value)
              }
            />

          </div>

        </div>

      </section>


      {/* FINANCIAL INFORMATION */}

      <section className="form-section">

        <h3>Financial Information</h3>

        <p className="form-section-description">
          Add the current financial details for this project.
        </p>


        <div className="form-grid">

          <div className="form-field">

            <label>
              Total Budget (₹)
            </label>

            <input
              type="number"
              placeholder="Enter total budget"
              value={budget}
              onChange={(e) =>
                setBudget(e.target.value)
              }
              required
            />

          </div>


          <div className="form-field">

            <label>
              Current Expenditure (₹)
            </label>

            <input
              type="number"
              placeholder="Enter expenditure"
              value={expenditure}
              onChange={(e) =>
                setExpenditure(e.target.value)
              }
              required
            />

          </div>

        </div>

      </section>


      {/* PROGRESS */}

      <section className="form-section">

        <h3>Progress</h3>

        <p className="form-section-description">
          Enter the current completion percentage.
        </p>


        <div className="form-grid">

          <div className="form-field">

            <label>
              Progress Percentage
            </label>

            <input
              type="number"
              placeholder="0 - 100"
              min="0"
              max="100"
              value={progressPercentage}
              onChange={(e) =>
                setProgressPercentage(
                  e.target.value
                )
              }
              required
            />

          </div>

        </div>

      </section>


      {/* ACTIONS */}

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


    {success && (
      <div className="success-message">
        ✓ Project created successfully!
      </div>
    )}


    {error && (
      <div className="error-message">
        {error}
      </div>
    )}

  </div>
);
}

export default AddProjectForm;