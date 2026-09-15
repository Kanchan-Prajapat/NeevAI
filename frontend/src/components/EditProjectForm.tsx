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

  const [name, setName] =
    useState(project.name);

  const [description, setDescription] =
    useState(
      project.description ?? ""
    );


  const [projectType, setProjectType] =
    useState<ProjectType>(
      project.projectType
    );


  const [sector, setSector] =
    useState<Sectors>(
      project.sector
    );


  const [status, setStatus] =
    useState<ProjectStatus>(
      project.status
    );


  const [
    implementingAgency,
    setImplementingAgency,
  ] = useState(
    project.implementingAgency
  );


  const [state, setState] =
    useState(
      project.location?.state ?? ""
    );


  const [district, setDistrict] =
    useState(
      project.location?.district ?? ""
    );


  const [city, setCity] =
    useState(
      project.location?.city ?? ""
    );


  const [budget, setBudget] =
    useState(
      project.budget.toString()
    );


  const [expenditure, setExpenditure] =
    useState(
      project.expenditure.toString()
    );


  const [
    progressPercentage,
    setProgressPercentage,
  ] = useState(
    project.progressPercentage.toString()
  );


  const [submitting, setSubmitting] =
    useState(false);


  const [error, setError] =
    useState<string | null>(null);


  const [success, setSuccess] =
    useState(false);


  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {

    e.preventDefault();


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

          name,

          description,

          projectType,

          sector,

          status,

          implementingAgency,


          location: {
            state,
            district,
            city,
          },


          budget:
            Number(budget),


          expenditure:
            Number(expenditure),


          progressPercentage:
            Number(progressPercentage),

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


  return (

    <div className="edit-project-page">


      {/* PAGE HEADER */}

      <div className="edit-project-header">

        <div>

          <h1>
            Edit Project
          </h1>

          <p>
            Update project information and
            current progress.
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


      {/* FORM */}

      <form
        className="edit-project-form"
        onSubmit={handleSubmit}
      >


        {/* BASIC INFORMATION */}

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
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                required
              />

            </div>


            <div className="edit-form-group full-width">

              <label>
                Description
              </label>

              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                rows={5}
              />

            </div>


          </div>

        </section>



        {/* CLASSIFICATION */}

        <section className="edit-form-card">

          <h2>
            Classification
          </h2>


          <div className="edit-form-grid">


            <div className="edit-form-group">

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

                {Object.values(
                  PROJECT_TYPES
                ).map((type) => (

                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>

                ))}

              </select>

            </div>



            <div className="edit-form-group">

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

                {SECTORS.map(
                  (item) => (

                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>

                  )
                )}

              </select>

            </div>



            <div className="edit-form-group">

              <label>
                Status
              </label>

              <select
                value={status}
                onChange={(e) =>
                  setStatus(
                    e.target.value as ProjectStatus
                  )
                }
              >

                {PROJECT_STATUSES.map(
                  (item) => (

                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>

                  )
                )}

              </select>

            </div>


          </div>

        </section>



        {/* ORGANIZATION */}

        <section className="edit-form-card">

          <h2>
            Organization
          </h2>


          <div className="edit-form-grid">

            <div className="edit-form-group full-width">

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



        {/* LOCATION */}

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
                  setState(e.target.value)
                }
              />

            </div>



            <div className="edit-form-group">

              <label>
                District
              </label>

              <input
                type="text"
                value={district}
                onChange={(e) =>
                  setDistrict(e.target.value)
                }
              />

            </div>



            <div className="edit-form-group">

              <label>
                City
              </label>

              <input
                type="text"
                value={city}
                onChange={(e) =>
                  setCity(e.target.value)
                }
              />

            </div>


          </div>

        </section>



        {/* FINANCIAL INFORMATION */}

        <section className="edit-form-card">

          <h2>
            Financial Information
          </h2>


          <div className="edit-form-grid">


            <div className="edit-form-group">

              <label>
                Total Budget
              </label>

              <input
                type="number"
                value={budget}
                onChange={(e) =>
                  setBudget(e.target.value)
                }
                min="0"
                required
              />

            </div>



            <div className="edit-form-group">

              <label>
                Current Expenditure
              </label>

              <input
                type="number"
                value={expenditure}
                onChange={(e) =>
                  setExpenditure(e.target.value)
                }
                min="0"
                required
              />

            </div>


          </div>

        </section>



        {/* PROGRESS */}

        <section className="edit-form-card">

          <h2>
            Project Progress
          </h2>


          <div className="edit-form-grid">

            <div className="edit-form-group">

              <label>
                Progress Percentage
              </label>

              <input
                type="number"
                value={progressPercentage}
                onChange={(e) =>
                  setProgressPercentage(
                    e.target.value
                  )
                }
                min="0"
                max="100"
                required
              />

            </div>

          </div>

        </section>



        {/* ACTIONS */}

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



        {/* SUCCESS */}

        {success && (

          <div className="edit-success-message">

            ✅ Project updated successfully!

          </div>

        )}



        {/* ERROR */}

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