import {
  useEffect,
  useState,
} from "react";

import {
  useSearchParams,
} from "react-router-dom";

import AddProjectForm from "./AddProjectForm";

import DashboardLayout from "./DashboardLayout";

import ProjectDetails from "./ProjectDetails";

import EditProjectForm from "./EditProjectForm";
import AddProjectSnapshotForm from "./AddProjectSnapshotForm";

import {
  getProjectByProjectId,
  deleteProject,
} from "../services/projectService";

import {
  getDashboardAnalytics,
} from "../services/projectAnalyticsService";

import type {
  Project,
} from "../../../shared/types";

import type {
  ProjectDashboardItem,
} from "../services/projectAnalyticsService";

import {
  Search,
  RefreshCw,
} from "lucide-react";

import "./Projects.css";


function Projects() {

  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  /* ==============================
     STATE
  ============================== */

  const [
    projects,
    setProjects,
  ] = useState<ProjectDashboardItem[]>(
    []
  );


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );


  const [
    showAddProjectForm,
    setShowAddProjectForm,
  ] = useState(false);


  const [
    selectedProject,
    setSelectedProject,
  ] = useState<Project | null>(
    null
  );


  const [
    showEditProjectForm,
    setShowEditProjectForm,
  ] = useState(false);

const [
  showAddSnapshotForm,
  setShowAddSnapshotForm,
] = useState(false);

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");


  /* ==============================
     LOAD PROJECTS
  ============================== */

  useEffect(() => {

    loadProjects();

  }, []);


  const loadProjects =
    async (
      force = false
    ): Promise<void> => {

      try {

        setLoading(true);

        setError(null);


        const analytics =
          await getDashboardAnalytics(force);


        setProjects(
          analytics.projects
        );


        console.log(
          "Projects analytics:",
          analytics.projects
        );

      } catch (err) {

        console.error(
          "Failed to load projects:",
          err
        );


        setError(
          "Failed to load projects."
        );

      } finally {

        setLoading(false);

      }

    };


  /* ==============================
     OPEN PROJECT DETAILS

     Dashboard analytics returns
     ProjectDashboardItem.

     ProjectDetails requires the
     original Project object.

     Therefore we fetch the master
     project before opening details.
  ============================== */


  const handleAddSnapshot = (): void => {
  setShowAddSnapshotForm(true);
};

  const handleOpenProject =
    async (
      projectId: string
    ): Promise<void> => {

      try {

        setLoading(true);

        setError(null);


        console.log(
          "Opening project:",
          projectId
        );


        const project =
          await getProjectByProjectId(
            projectId
          );


        if (!project) {

          setError(
            "Project details could not be found."
          );

          return;

        }


        setSelectedProject(
          project
        );

      } catch (err) {

        console.error(
          "Failed to open project:",
          err
        );


        setError(
          "Failed to load project details."
        );

      } finally {

        setLoading(false);

      }

    };


  useEffect(() => {

    const openProjectId =
      searchParams.get("open");

    if (!openProjectId || selectedProject) {
      return;
    }

    handleOpenProject(openProjectId).then(() => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("open");
      setSearchParams(nextParams, { replace: true });
    });

  }, [searchParams, selectedProject]);


  /* ==============================
     SEARCH FILTER
  ============================== */

  const formatStatusLabel = (
    status?: string
  ): string => {
    if (!status?.trim()) {
      return "No Data";
    }

    return status
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const uniqueProjects = Array.from(
    new Map(
      projects.map((project) => [
        project.projectId,
        project,
      ])
    ).values()
  );

  const filteredProjects =
    uniqueProjects.filter(
      (project) => {

        const query =
          searchQuery
            .toLowerCase()
            .trim();


        if (!query) {

          return true;

        }


        return (

          project.projectName
            ?.toLowerCase()
            .includes(query) ||

          project.projectId
            ?.toLowerCase()
            .includes(query) ||

          project.projectType
            ?.toLowerCase()
            .includes(query) ||

          project.domain
            ?.toLowerCase()
            .includes(query) ||

          project.implementingAgency
            ?.toLowerCase()
            .includes(query) ||

          project.status
            ?.toLowerCase()
            .includes(query)

        );

      }
    );


  /* ==============================
     ADD PROJECT PAGE
  ============================== */

  if (showAddProjectForm) {

    return (

      <AddProjectForm

        onCancel={() => {

          setShowAddProjectForm(
            false
          );

        }}

        onSuccess={() => {

          setShowAddProjectForm(
            false
          );

          loadProjects(true);

        }}

      />

    );

  }


  /* ==============================
     EDIT PROJECT PAGE
  ============================== */

  if (
    showEditProjectForm &&
    selectedProject
  ) {

    return (

      <EditProjectForm

        project={selectedProject}

        onCancel={() => {

          setShowEditProjectForm(
            false
          );

        }}

        onSuccess={async () => {

          await loadProjects(true);


          setShowEditProjectForm(
            false
          );


          setSelectedProject(
            null
          );

        }}

      />

    );

  }

/* ==============================
   ADD SNAPSHOT PAGE
============================== */

if (
  showAddSnapshotForm &&
  selectedProject
) {
  return (
    <AddProjectSnapshotForm
      project={selectedProject}

      onCancel={() => {
        setShowAddSnapshotForm(false);
      }}

      onSuccess={async () => {
        setShowAddSnapshotForm(false);

        await loadProjects(true);
      }}
    />
  );
}

  /* ==============================
     PROJECT DETAILS PAGE
  ============================== */

  if (selectedProject) {

    return (

    <ProjectDetails
  project={selectedProject}

  onBack={() => {
    setSelectedProject(null);
  }}

  onEdit={() => {
    setShowEditProjectForm(true);
  }}

  onAddSnapshot={() => {
    setShowAddSnapshotForm(true);
  }}

  onDelete={async () => {
    if (!selectedProject.id) {
      throw new Error(
        "Project document ID is missing."
      );
    }

    await deleteProject(
      selectedProject.id
    );

    setSelectedProject(null);
    await loadProjects(true);
  }}
/>

    );

  }


  /* ==============================
     MAIN PROJECTS PAGE
  ============================== */

  return (

    <DashboardLayout>

      <div className="projects-page">


        {/* =========================
            PAGE HEADER
        ========================== */}

        <div className="projects-header">

          <div>

            <h2>
              Projects
            </h2>

            <p>
              Manage and monitor all
              infrastructure projects
            </p>

          </div>


          <button
            type="button"
            className="add-project-button"
            onClick={() =>
              setShowAddProjectForm(
                true
              )
            }
          >
            + Add Project
          </button>

        </div>


        {/* =========================
            PROJECT CONTROLS
        ========================== */}

        <div className="projects-controls">


          <div className="project-search">

            <Search size={18} />


            <input
              type="text"
              placeholder="Search by project name, ID, domain..."
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(
                  event.target.value
                )
              }
            />

          </div>


          <button
            type="button"
            className="refresh-projects-button"
            onClick={() => loadProjects(true)}
          >

            <RefreshCw size={18} />

            Refresh

          </button>

        </div>


        {/* =========================
            LOADING
        ========================== */}

        {loading && (

          <div className="projects-message">

            Loading projects...

          </div>

        )}


        {/* =========================
            ERROR
        ========================== */}

        {!loading && error && (

          <div className="projects-message error">

            <p>
              {error}
            </p>


            <button
              type="button"
              onClick={() => loadProjects(true)}
            >
              Retry
            </button>

          </div>

        )}


        {/* =========================
            PROJECT TABLE
        ========================== */}

        {!loading && !error && (

          <div className="projects-table-wrapper">

            <table className="projects-table">


              <thead>

                <tr>

                  <th>
                    Project
                  </th>

                  <th>
                    Type
                  </th>

                  <th>
                    Sector
                  </th>

                  <th>
                    Implementing Agency
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Project Cost
                  </th>

                  <th>
                    Progress
                  </th>

                </tr>

              </thead>


              <tbody>


                {filteredProjects.length === 0 ? (

                  <tr>

                    <td
                      colSpan={7}
                      className="empty-projects"
                    >

                      {searchQuery
                        ? "No projects match your search."
                        : "No projects available."
                      }

                    </td>

                  </tr>

                ) : (

                  filteredProjects.map(
                    (project) => (

                      <tr
                        key={
                          project.projectId
                        }
                        className="project-row"
                        onClick={() =>
                          handleOpenProject(
                            project.projectId
                          )
                        }
                      >


                        {/* PROJECT */}

                        <td>

                          <div className="project-name-cell">

                            <button
                              type="button"
                              className="project-name-button"
                              title={
                                project.projectName ||
                                "Unnamed Project"
                              }
                              onClick={(event) => {

                                event.stopPropagation();


                                handleOpenProject(
                                  project.projectId
                                );

                              }}
                            >

                              {project.projectName ||
                                "Unnamed Project"
                              }

                            </button>


                            <span
                              className="project-id"
                              title={project.projectId}
                            >

                              {project.projectId}

                            </span>

                          </div>

                        </td>


                        {/* TYPE */}

                        <td
                          title={
                            project.projectType ??
                            "No Data"
                          }
                        >

                          {project.projectType ??
                            "No Data"
                          }

                        </td>


                        {/* SECTOR */}

                        <td
                          title={
                            project.domain ??
                            "No Data"
                          }
                        >

                          {project.domain ??
                            "No Data"
                          }

                        </td>


                        {/* IMPLEMENTING AGENCY */}

                        <td
                          title={
                            project.implementingAgency ??
                            "No Data"
                          }
                        >

                          {project.implementingAgency ??
                            "No Data"
                          }

                        </td>


                        {/* STATUS */}

                        <td>

                          <span
                            className={`
                              project-status
                              status-${(
                                project.status ??
                                "unknown"
                              ).trim().toLowerCase()}
                            `}
                          >

                            {formatStatusLabel(project.status)}

                          </span>

                        </td>


                        {/* PROJECT COST */}

                      <td>
  {typeof project.budget === "number" ? (
    <>
      ₹ {(project.budget / 10000000).toFixed(2)} Cr
    </>
  ) : (
    "No Data"
  )}
</td>
                        {/* PROGRESS */}

                        <td>

                          <div
                            className="project-progress"
                          >

                            <div
                              className="project-progress-bar"
                            >

                              <div
                                className="project-progress-fill"
                                style={{

                                  width: `${Math.min(
                                    Math.max(
                                      project.progressPercentage ??
                                        0,
                                      0
                                    ),
                                    100
                                  )}%`,

                                }}
                              />

                            </div>


                            <span>

                              {project.progressPercentage ??
                                0
                              }

                              %

                            </span>

                          </div>

                        </td>


                      </tr>

                    )
                  )

                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </DashboardLayout>

  );

}


export default Projects;