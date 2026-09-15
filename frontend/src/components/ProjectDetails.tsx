import { useEffect, useState } from "react";

import type {
  Project,
  ProjectSnapshot,
  Prediction,
} from "../../../shared/types";

import {
  getAllProjectSnapshots,
} from "../services/projectSnapshotService";

import {
  getPredictionsByProjectId,
} from "../services/predictionService";

import "./ProjectDetails.css";


interface ProjectDetailsProps {
  project: Project;

  onBack: () => void;

  onEdit: () => void;
}


/* =========================================
   DATE CONVERSION
========================================= */

const formatDate = (
  value: unknown
): string => {

  if (!value) {
    return "Not available";
  }


  if (value instanceof Date) {

    return value.toLocaleDateString(
      "en-IN"
    );

  }


  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (
      value as {
        toDate?: unknown;
      }
    ).toDate === "function"
  ) {

    return (
      value as {
        toDate: () => Date;
      }
    )
      .toDate()
      .toLocaleDateString(
        "en-IN"
      );

  }


  if (typeof value === "string") {

    const date =
      new Date(value);


    if (!Number.isNaN(
      date.getTime()
    )) {

      return date.toLocaleDateString(
        "en-IN"
      );

    }


    return value;

  }


  return "Not available";

};


/* =========================================
   TIMESTAMP COMPARISON
========================================= */

const getTimestampMilliseconds = (
  value: unknown
): number => {

  if (!value) {
    return 0;
  }


  if (value instanceof Date) {
    return value.getTime();
  }


  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (
      value as {
        toDate?: unknown;
      }
    ).toDate === "function"
  ) {

    return (
      value as {
        toDate: () => Date;
      }
    )
      .toDate()
      .getTime();

  }


  if (typeof value === "string") {

    const time =
      new Date(value).getTime();


    return Number.isNaN(time)
      ? 0
      : time;

  }


  return 0;

};


/* =========================================
   GET LATEST SNAPSHOT
========================================= */

const getLatestSnapshot = (
  snapshots: ProjectSnapshot[]
): ProjectSnapshot | null => {

  if (snapshots.length === 0) {
    return null;
  }


  return snapshots.reduce(
    (
      latest,
      current
    ) => {

      const latestTime =
        getTimestampMilliseconds(
          latest.reportDate
        );


      const currentTime =
        getTimestampMilliseconds(
          current.reportDate
        );


      return currentTime > latestTime
        ? current
        : latest;

    }
  );

};


/* =========================================
   CRORE FORMAT
========================================= */

const formatCrore = (
  value?: number | null
): string => {

  if (
    value === undefined ||
    value === null
  ) {

    return "No Data";

  }


  return `₹ ${value.toLocaleString(
    "en-IN"
  )} Cr`;

};


/* =========================================
   COMPONENT
========================================= */

function ProjectDetails({
  project,
  onBack,
  onEdit,
}: ProjectDetailsProps) {


  const [
    latestSnapshot,
    setLatestSnapshot,
  ] = useState<
    ProjectSnapshot | null
  >(null);


  const [
    prediction,
    setPrediction,
  ] = useState<
    Prediction | null
  >(null);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);



  /* =========================================
     LOAD PROJECT DETAILS
  ========================================= */

  useEffect(() => {

    loadProjectDetails();

  }, [project.projectId]);



  const loadProjectDetails =
    async () => {

      try {

        setLoading(true);

        setError(null);


        const [
          allSnapshots,
          predictions,
        ] =
          await Promise.all([

            getAllProjectSnapshots(),

            getPredictionsByProjectId(
              project.projectId
            ),

          ]);


        const projectSnapshots =
          allSnapshots.filter(
            (snapshot) =>
              snapshot.projectId ===
              project.projectId
          );


        const latest =
          getLatestSnapshot(
            projectSnapshots
          );


        setLatestSnapshot(
          latest
        );


        if (
          predictions &&
          predictions.length > 0
        ) {

          setPrediction(
            predictions[0]
          );

        } else {

          setPrediction(
            null
          );

        }


      } catch (err) {

        console.error(
          "Failed to load project details:",
          err
        );


        setError(
          "Failed to load project details."
        );

      } finally {

        setLoading(false);

      }

    };



  /* =========================================
     LOADING
  ========================================= */

  if (loading) {

    return (

      <div className="project-details-page">

        <div className="project-details-message">

          Loading project details...

        </div>

      </div>

    );

  }



  /* =========================================
     ERROR
  ========================================= */

  if (error) {

    return (

      <div className="project-details-page">

        <div className="project-details-message error">

          <p>
            {error}
          </p>


          <button
            type="button"
            onClick={loadProjectDetails}
          >

            Retry

          </button>


        </div>

      </div>

    );

  }



  return (

    <div className="project-details-page">


      {/* =====================================
          PAGE HEADER
      ====================================== */}

      <div className="project-details-header">


        <div>

          <button
            type="button"
            className="back-button"
            onClick={onBack}
          >

            ← Back to Projects

          </button>


          <h1>

            {project.projectName}

          </h1>


          <p>

            Project ID: {project.projectId}

          </p>


        </div>



        <div className="project-header-actions">


          {latestSnapshot?.projectStatus && (

            <div
              className={`
                project-status-badge
                status-${latestSnapshot.projectStatus.toLowerCase()}
              `}
            >

              {latestSnapshot.projectStatus}

            </div>

          )}


          <button
            type="button"
            className="edit-project-button"
            onClick={onEdit}
          >

            Edit Project

          </button>


        </div>


      </div>



      {/* =====================================
          BASIC INFORMATION
      ====================================== */}

      <section className="details-card">


        <h2>
          Basic Information
        </h2>


        <div className="details-grid">


          <div className="detail-item">

            <span>
              Project ID
            </span>

            <strong>
              {project.projectId}
            </strong>

          </div>



          <div className="detail-item">

            <span>
              Project Name
            </span>

            <strong>
              {project.projectName}
            </strong>

          </div>



          <div className="detail-item">

            <span>
              Ministry
            </span>

            <strong>
              {project.ministry}
            </strong>

          </div>



          <div className="detail-item">

            <span>
              Data Source
            </span>

            <strong>
              {project.dataSource}
            </strong>

          </div>



          <div className="detail-item full-width">

            <span>
              Source Project Code
            </span>

            <strong>

              {project.sourceProjectCode ??
                "Not available"}

            </strong>

          </div>


        </div>


      </section>



      {/* =====================================
          CLASSIFICATION
      ====================================== */}

      <section className="details-card">


        <h2>
          Classification
        </h2>


        <div className="details-grid">


          <div className="detail-item">

            <span>
              Domain
            </span>

            <strong>
              {project.domain}
            </strong>

          </div>



          <div className="detail-item">

            <span>
              Project Type
            </span>

            <strong>

              {project.projectType ??
                "Not available"}

            </strong>

          </div>


        </div>


      </section>



      {/* =====================================
          IMPLEMENTING ORGANIZATION
      ====================================== */}

      <section className="details-card">


        <h2>
          Organization
        </h2>


        <div className="details-grid">


          <div className="detail-item full-width">

            <span>
              Implementing Agency
            </span>

            <strong>

              {project.implementingAgency ??
                "Not available"}

            </strong>

          </div>


        </div>


      </section>



      {/* =====================================
          LOCATION
      ====================================== */}

      <section className="details-card">


        <h2>
          Location
        </h2>


        <div className="details-grid">


          <div className="detail-item">

            <span>
              State
            </span>

            <strong>

              {project.state ??
                "Not available"}

            </strong>

          </div>



          <div className="detail-item">

            <span>
              District / Location
            </span>

            <strong>

              {project.districtOrLocation ??
                "Not available"}

            </strong>

          </div>


        </div>


      </section>



      {/* =====================================
          ORIGINAL PROJECT INFORMATION
      ====================================== */}

      <section className="details-card">


        <h2>
          Original Project Information
        </h2>


        <div className="details-grid">


          <div className="detail-item">

            <span>
              Approval Date
            </span>

            <strong>

              {formatDate(
                project.approvalDate
              )}

            </strong>

          </div>



          <div className="detail-item">

            <span>
              Original Project Cost
            </span>

            <strong>

              {formatCrore(
                project.originalCostCr
              )}

            </strong>

          </div>



          <div className="detail-item full-width">

            <span>
              Original Completion Date
            </span>

            <strong>

              {formatDate(
                project.originalCompletionDate
              )}

            </strong>

          </div>


        </div>


      </section>



      {/* =====================================
          LATEST SNAPSHOT
      ====================================== */}

      <section className="details-card">


        <h2>
          Latest Project Snapshot
        </h2>


        {latestSnapshot ? (

          <div className="details-grid">


            <div className="detail-item">

              <span>
                Report Type
              </span>

              <strong>
                {latestSnapshot.reportType}
              </strong>

            </div>



            <div className="detail-item">

              <span>
                Report Period
              </span>

              <strong>
                {latestSnapshot.reportPeriod}
              </strong>

            </div>



            <div className="detail-item">

              <span>
                Report Date
              </span>

              <strong>

                {formatDate(
                  latestSnapshot.reportDate
                )}

              </strong>

            </div>



            <div className="detail-item">

              <span>
                Current Status
              </span>

              <strong>

                {latestSnapshot.projectStatus ??
                  "No Data"}

              </strong>

            </div>



            <div className="detail-item">

              <span>
                Revised Cost
              </span>

              <strong>

                {formatCrore(
                  latestSnapshot.revisedCostCr
                )}

              </strong>

            </div>



            <div className="detail-item">

              <span>
                Anticipated Cost
              </span>

              <strong>

                {formatCrore(
                  latestSnapshot.anticipatedCostCr
                )}

              </strong>

            </div>



            <div className="detail-item">

              <span>
                Cumulative Expenditure
              </span>

              <strong>

                {formatCrore(
                  latestSnapshot.cumulativeExpenditureCr
                )}

              </strong>

            </div>



            <div className="detail-item">

              <span>
                Physical Progress
              </span>

              <strong>

                {latestSnapshot.physicalProgressPct ??
                  0}

                %

              </strong>

            </div>



            <div className="detail-item">

              <span>
                Revised Completion Date
              </span>

              <strong>

                {formatDate(
                  latestSnapshot.revisedCompletionDate
                )}

              </strong>

            </div>



            <div className="detail-item">

              <span>
                Anticipated Completion Date
              </span>

              <strong>

                {formatDate(
                  latestSnapshot.anticipatedCompletionDate
                )}

              </strong>

            </div>



            <div className="detail-item full-width">

              <span>
                Remarks
              </span>

              <p>

                {latestSnapshot.remarks ??
                  "No remarks available."}

              </p>

            </div>


          </div>

        ) : (

          <div className="no-data-message">

            No project snapshot available.

          </div>

        )}


      </section>



      {/* =====================================
          PHYSICAL PROGRESS
      ====================================== */}

      <section className="details-card">


        <h2>
          Physical Progress
        </h2>


        <div className="progress-section">


          <div className="progress-info">

            <span>
              Latest Reported Progress
            </span>


            <strong>

              {latestSnapshot?.physicalProgressPct ??
                0}

              %

            </strong>


          </div>



          <div className="progress-bar">

            <div

              className="progress-fill"

              style={{

                width: `${Math.min(

                  Math.max(

                    latestSnapshot
                      ?.physicalProgressPct ??
                    0,

                    0

                  ),

                  100

                )}%`,

              }}

            />

          </div>


        </div>


      </section>



      {/* =====================================
          AI PREDICTION
      ====================================== */}

      <section className="details-card">


        <h2>
          AI Risk Prediction
        </h2>


        {prediction ? (

          <div className="details-grid">


            <div className="detail-item">

              <span>
                Prediction Type
              </span>

              <strong>
                {prediction.predictionType}
              </strong>

            </div>



            <div className="detail-item">

              <span>
                Risk Level
              </span>

              <strong>
                {prediction.riskLevel}
              </strong>

            </div>



            <div className="detail-item">

              <span>
                Confidence Score
              </span>

              <strong>

                {prediction.confidenceScore}

                %

              </strong>

            </div>



            <div className="detail-item">

              <span>
                Data Status
              </span>

              <strong>
                {prediction.dataStatus}
              </strong>

            </div>



            <div className="detail-item full-width">

              <span>
                AI Explanation
              </span>

              <p>

                {prediction.explanation ??
                  "No explanation available."}

              </p>

            </div>


          </div>

        ) : (

          <div className="no-data-message">

            No AI prediction available for this project.

          </div>

        )}


      </section>


    </div>

  );

}


export default ProjectDetails;