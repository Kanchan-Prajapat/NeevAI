from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import firestore

from backend.firebase.firestore_service import (
    get_latest_project_snapshot,
    get_project_by_project_id,
    get_all_projects as firestore_get_all_projects,
    get_project_snapshots,
    get_all_project_snapshots,
    get_derived_metric_by_snapshot,
    save_derived_metric,
    create_recalc_log,
    update_recalc_log,

    create_project,
    get_project_by_document_id,
    update_project,
    delete_project,

    create_project_snapshot,
    get_project_snapshot_by_id,
    update_project_snapshot,
    delete_project_snapshot,
)

from backend.ml.risk_engine import (
    calculate_project_risk,
)

from backend.ml.prediction_engine import (
    get_model_status,
    predict_project,
    predict_next_month_progress,
)


from backend.ml.ai_advisor import (
    AIProjectAdvisor,
)

# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="NeevAI ML API",
    description=(
        "AI-powered infrastructure project "
        "prediction and decision intelligence API"
    ),
    version="1.0.0",
)


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "https://neev-ai-bice.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# ---------------------------------------------------------------------------
# What-If Simulation Request
# ---------------------------------------------------------------------------

class WhatIfScenario(BaseModel):

    originalCostCr: Optional[float] = Field(
        default=None,
        ge=0,
    )

    cumulativeExpenditureCr: Optional[float] = Field(
        default=None,
        ge=0,
    )

    physicalProgressPct: Optional[float] = Field(
        default=None,
        ge=0,
        le=100,
    )

    totalMilestones: Optional[int] = Field(
        default=None,
        ge=0,
    )

    completedMilestones: Optional[int] = Field(
        default=None,
        ge=0,
    )

    delayedMilestones: Optional[int] = Field(
        default=None,
        ge=0,
    )

    landAcquisitionDelayMonths: Optional[float] = Field(
        default=None,
        ge=0,
    )

    clearanceDelayMonths: Optional[float] = Field(
        default=None,
        ge=0,
    )

    contractorDelayScore: Optional[float] = Field(
        default=None,
        ge=0,
        le=10,
    )

    geologicalDelayScore: Optional[float] = Field(
        default=None,
        ge=0,
        le=10,
    )

# ---------------------------------------------------------------------------
# Project Intelligence Q&A Request
# ---------------------------------------------------------------------------

class ProjectIntelligenceQuery(BaseModel):

    query: str = Field(
        ...,
        min_length=1,
        max_length=500,
    )

# ---------------------------------------------------------------------------
# Root
# ---------------------------------------------------------------------------

@app.get("/")
def root() -> Dict[str, Any]:
    return {
        "name": "NeevAI ML API",
        "status": "running",
        "service": "prediction-engine",
    }


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
def health() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "models": get_model_status(),
    }




# ---------------------------------------------------------------------------
# Get All Projects
# ---------------------------------------------------------------------------

@app.get("/api/projects")
def get_all_projects_endpoint() -> Dict[str, Any]:

    try:
        projects = firestore_get_all_projects()

        return {
            "success": True,
            "count": len(projects),
            "projects": projects,
        }

    except Exception as error:

        print(
            "Get all projects error:",
            repr(error),
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to fetch projects.",
        )


# ---------------------------------------------------------------------------
# Create Project
# ---------------------------------------------------------------------------

@app.post("/api/projects")
def create_project_endpoint(
    project: Dict[str, Any],
) -> Dict[str, Any]:

    project_id = project.get("projectId")

    if not project_id:
        raise HTTPException(
            status_code=400,
            detail="Project ID is required.",
        )

    existing_project = (
        get_project_by_project_id(
            str(project_id)
        )
    )

    if existing_project is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Project already exists: "
                f"{project_id}"
            ),
        )

    document_id = create_project(
        project
    )

    created_project = (
        get_project_by_document_id(
            document_id
        )
    )

    return {
        "success": True,
        "projectId": str(project_id),
        "documentId": document_id,
        "project": created_project,
    }


# ---------------------------------------------------------------------------
# Update Project
# ---------------------------------------------------------------------------

@app.patch("/api/projects/{project_document_id}")
def update_project_endpoint(
    project_document_id: str,
    project_data: Dict[str, Any],
) -> Dict[str, Any]:

    project_document_id = (
        project_document_id.strip()
    )

    if not project_document_id:
        raise HTTPException(
            status_code=400,
            detail="Project document ID is required.",
        )

    existing_project = (
        get_project_by_document_id(
            project_document_id
        )
    )

    if existing_project is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Project not found: "
                f"{project_document_id}"
            ),
        )

    cleaned_data = {
        key: value
        for key, value in project_data.items()
        if value is not None
    }

    updated = update_project(
        project_document_id,
        cleaned_data,
    )

    if not updated:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Project not found: "
                f"{project_document_id}"
            ),
        )

    updated_project = (
        get_project_by_document_id(
            project_document_id
        )
    )

    return {
        "success": True,
        "documentId": project_document_id,
        "project": updated_project,
    }


# ---------------------------------------------------------------------------
# Get Project By Firestore Document ID
# ---------------------------------------------------------------------------

@app.get("/api/projects/document/{project_document_id}")
def get_project_by_document_id_endpoint(
    project_document_id: str,
) -> Dict[str, Any]:

    project_document_id = (
        project_document_id.strip()
    )

    if not project_document_id:
        raise HTTPException(
            status_code=400,
            detail="Project document ID is required.",
        )

    project = (
        get_project_by_document_id(
            project_document_id
        )
    )

    if project is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Project not found: "
                f"{project_document_id}"
            ),
        )

    return {
        "success": True,
        "project": project,
    }

# ---------------------------------------------------------------------------
# Delete Project
# ---------------------------------------------------------------------------

@app.delete("/api/projects/{project_document_id}")
def delete_project_endpoint(
    project_document_id: str,
) -> Dict[str, Any]:

    project_document_id = (
        project_document_id.strip()
    )

    if not project_document_id:
        raise HTTPException(
            status_code=400,
            detail="Project document ID is required.",
        )

    deleted_project = (
        delete_project(
            project_document_id
        )
    )

    if deleted_project is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Project not found: "
                f"{project_document_id}"
            ),
        )

    return {
        "success": True,
        "documentId": project_document_id,
        "deleted": True,
        "project": deleted_project,
    }
# ---------------------------------------------------------------------------
# Get Project Snapshots
# ---------------------------------------------------------------------------

@app.get("/api/projects/{project_id}/snapshots")
def get_project_snapshots_endpoint(
    project_id: str,
) -> Dict[str, Any]:

    project_id = project_id.strip()

    if not project_id:
        raise HTTPException(
            status_code=400,
            detail="Project ID is required.",
        )

    try:
        snapshots = get_project_snapshots(
            project_id
        )

        return {
            "success": True,
            "projectId": project_id,
            "count": len(snapshots),
            "snapshots": snapshots,
        }

    except Exception as error:
        print(
            "Get project snapshots error:",
            repr(error),
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to fetch project snapshots.",
        )


# ---------------------------------------------------------------------------
# Get All Project Snapshots
# ---------------------------------------------------------------------------

@app.get("/api/snapshots")
def get_all_project_snapshots_endpoint() -> Dict[str, Any]:

    try:
        snapshots = get_all_project_snapshots()

        return {
            "success": True,
            "count": len(snapshots),
            "snapshots": snapshots,
        }

    except Exception as error:
        print(
            "Get all project snapshots error:",
            repr(error),
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to fetch project snapshots.",
        )
    

# ---------------------------------------------------------------------------
# Create Project Snapshot
# ---------------------------------------------------------------------------

@app.post(
    "/api/projects/{project_id}/snapshots"
)
def create_project_snapshot_endpoint(
    project_id: str,
    snapshot: Dict[str, Any],
) -> Dict[str, Any]:

    project_id = project_id.strip()

    if not project_id:
        raise HTTPException(
            status_code=400,
            detail="Project ID is required.",
        )

    project = get_project_by_project_id(
        project_id
    )

    if project is None:
        raise HTTPException(
            status_code=404,
            detail=f"Project not found: {project_id}",
        )

    snapshot["projectId"] = project_id

    snapshot_id = create_project_snapshot(
        snapshot
    )

    try:
        recalculation = (
            recalculate_project_endpoint(
                project_id
            )
        )
    except Exception:
        # Snapshot creation succeeded, but
        # recalculation failed.
        raise

    created_snapshot = (
        get_project_snapshot_by_id(
            snapshot_id
        )
    )

    return {
        "success": True,
        "snapshotId": snapshot_id,
        "snapshot": created_snapshot,
        "recalculation": recalculation,
    }



# ---------------------------------------------------------------------------
# Update Project Snapshot
# ---------------------------------------------------------------------------

@app.patch(
    "/api/snapshots/{snapshot_id}"
)
def update_project_snapshot_endpoint(
    snapshot_id: str,
    updates: Dict[str, Any],
) -> Dict[str, Any]:

    snapshot_id = snapshot_id.strip()

    if not snapshot_id:
        raise HTTPException(
            status_code=400,
            detail="Snapshot ID is required.",
        )

    existing_snapshot = (
        get_project_snapshot_by_id(
            snapshot_id
        )
    )

    if existing_snapshot is None:
        raise HTTPException(
            status_code=404,
            detail=f"Snapshot not found: {snapshot_id}",
        )

    project_id = (
        updates.get("projectId")
        or existing_snapshot.get("projectId")
    )

    if not project_id:
        raise HTTPException(
            status_code=400,
            detail=(
                "Project ID is required to "
                "recalculate the project."
            ),
        )

    updated = update_project_snapshot(
        snapshot_id,
        updates,
    )

    if not updated:
        raise HTTPException(
            status_code=404,
            detail=f"Snapshot not found: {snapshot_id}",
        )

    recalculation = (
        recalculate_project_endpoint(
            str(project_id)
        )
    )

    updated_snapshot = (
        get_project_snapshot_by_id(
            snapshot_id
        )
    )

    return {
        "success": True,
        "snapshotId": snapshot_id,
        "snapshot": updated_snapshot,
        "recalculation": recalculation,
    }


# ---------------------------------------------------------------------------
# Delete Project Snapshot
# ---------------------------------------------------------------------------

@app.delete(
    "/api/snapshots/{snapshot_id}"
)
def delete_project_snapshot_endpoint(
    snapshot_id: str,
) -> Dict[str, Any]:

    snapshot_id = snapshot_id.strip()

    if not snapshot_id:
        raise HTTPException(
            status_code=400,
            detail="Snapshot ID is required.",
        )

    deleted_snapshot = (
        delete_project_snapshot(
            snapshot_id
        )
    )

    if deleted_snapshot is None:
        raise HTTPException(
            status_code=404,
            detail=f"Snapshot not found: {snapshot_id}",
        )

    project_id = deleted_snapshot.get(
        "projectId"
    )

    if not project_id:
        raise HTTPException(
            status_code=500,
            detail=(
                "Deleted snapshot did not contain "
                "a project ID."
            ),
        )

    recalculation = (
        recalculate_project_endpoint(
            str(project_id)
        )
    )

    return {
        "success": True,
        "snapshotId": snapshot_id,
        "deleted": True,
        "projectId": project_id,
        "recalculation": recalculation,
    }



# ---------------------------------------------------------------------------
# Get Derived Metric for Project Snapshot
# ---------------------------------------------------------------------------

@app.get(
    "/api/projects/{project_id}/snapshots/{snapshot_id}/derived-metric"
)
def get_derived_metric_endpoint(
    project_id: str,
    snapshot_id: str,
) -> Dict[str, Any]:

    project_id = project_id.strip()
    snapshot_id = snapshot_id.strip()

    if not project_id:
        raise HTTPException(
            status_code=400,
            detail="Project ID is required.",
        )

    if not snapshot_id:
        raise HTTPException(
            status_code=400,
            detail="Snapshot ID is required.",
        )

    try:
        derived_metric = get_derived_metric_by_snapshot(
            project_id,
            snapshot_id,
        )

        if derived_metric is None:
            return {
                "success": True,
                "projectId": project_id,
                "snapshotId": snapshot_id,
                "derivedMetric": None,
            }

        return {
            "success": True,
            "projectId": project_id,
            "snapshotId": snapshot_id,
            "derivedMetric": derived_metric,
        }

    except Exception as error:
        print(
            "Get derived metric error:",
            repr(error),
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to fetch derived metric.",
        )


# ---------------------------------------------------------------------------
# Recalculate Project Risk
# ---------------------------------------------------------------------------

@app.post(
    "/api/projects/{project_id}/recalculate"
)
def recalculate_project_endpoint(
    project_id: str,
) -> Dict[str, Any]:

    project_id = project_id.strip()

    if not project_id:
        raise HTTPException(
            status_code=400,
            detail="Project ID is required.",
        )

    log_id = create_recalc_log(
        project_id
    )

    try:

        # ---------------------------------------------------------------
        # 1. Get project
        # ---------------------------------------------------------------

        project = get_project_by_project_id(
            project_id
        )

        if project is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Project not found: "
                    f"{project_id}"
                ),
            )

        # ---------------------------------------------------------------
        # 2. Get all project snapshots
        # ---------------------------------------------------------------

        snapshots = get_project_snapshots(
            project_id
        )

        if not snapshots:
            raise HTTPException(
                status_code=404,
                detail=(
                    "No snapshots found for "
                    f"project: {project_id}"
                ),
            )

        # ---------------------------------------------------------------
        # 3. Sort snapshots by report date
        # ---------------------------------------------------------------

        def get_snapshot_timestamp(
            snapshot: Dict[str, Any],
        ) -> float:

            value = snapshot.get(
                "reportDate"
            )

            if value is None:
                return 0.0

            if hasattr(
                value,
                "timestamp",
            ):
                return float(
                    value.timestamp()
                )

            if hasattr(
                value,
                "to_datetime",
            ):
                return float(
                    value.to_datetime().timestamp()
                )

            if isinstance(
                value,
                str,
            ):
                try:
                    from datetime import datetime

                    return datetime.fromisoformat(
                        value.replace(
                            "Z",
                            "+00:00",
                        )
                    ).timestamp()

                except ValueError:
                    return 0.0

            return 0.0

        sorted_snapshots = sorted(
            snapshots,
            key=get_snapshot_timestamp,
        )

        # ---------------------------------------------------------------
        # 4. Get latest + previous snapshot
        # ---------------------------------------------------------------

        latest_snapshot = (
            sorted_snapshots[-1]
        )

        previous_snapshot = (
            sorted_snapshots[-2]
            if len(sorted_snapshots) > 1
            else None
        )

        latest_snapshot_id = (
            latest_snapshot.get("id")
        )

        if not latest_snapshot_id:
            raise ValueError(
                "Latest snapshot does not have an ID."
            )

        # ---------------------------------------------------------------
        # 5. Calculate risk
        # ---------------------------------------------------------------

        result = calculate_project_risk(
            project=project,
            latest_snapshot=latest_snapshot,
            previous_snapshot=previous_snapshot,
        )

        # ---------------------------------------------------------------
        # 6. Save derived metric
        # ---------------------------------------------------------------

        derived_metric_id = (
            save_derived_metric(
                project_id=project_id,
                snapshot_id=latest_snapshot_id,
                metric=result,
            )
        )

        # ---------------------------------------------------------------
        # 7. Mark recalculation completed
        # ---------------------------------------------------------------

        update_recalc_log(
            log_id,
            {
                "status": "completed",
                "endedAt": firestore.SERVER_TIMESTAMP,
                "computedAt": firestore.SERVER_TIMESTAMP,
            },
        )

        return {
            "success": True,
            "projectId": project_id,
            "snapshotId": latest_snapshot_id,
            "derivedMetricId": derived_metric_id,
            "derivedMetric": result,
        }

    except HTTPException as error:

        update_recalc_log(
            log_id,
            {
                "status": "failed",
                "errorMessage": error.detail,
                "endedAt": firestore.SERVER_TIMESTAMP,
            },
        )

        raise

    except Exception as error:

        print(
            "Project recalculation error:",
            repr(error),
        )

        update_recalc_log(
            log_id,
            {
                "status": "failed",
                "errorMessage": str(error),
                "endedAt": firestore.SERVER_TIMESTAMP,
            },
        )

        raise HTTPException(
            status_code=500,
            detail="Project recalculation failed.",
        )

    
    
# ---------------------------------------------------------------------------
# Firestore → ML prediction
# ---------------------------------------------------------------------------

@app.get(
    "/api/predictions/project/{project_id}"
)
def get_project_prediction(
    project_id: str,
) -> Dict[str, Any]:

    project_id = project_id.strip()

    if not project_id:
        raise HTTPException(
            status_code=400,
            detail="Project ID is required.",
        )

    try:

        # ---------------------------------------------------------------
        # 1. Find project using business projectId
        # ---------------------------------------------------------------

        project = get_project_by_project_id(
            project_id
        )

        if project is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Project not found: "
                    f"{project_id}"
                ),
            )

        # ---------------------------------------------------------------
        # 2. Get latest snapshot
        # ---------------------------------------------------------------

        snapshot = (
            get_latest_project_snapshot(
                project_id
            )
        )

        if snapshot is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "No project snapshot found "
                    f"for project: {project_id}"
                ),
            )

        # ---------------------------------------------------------------
        # 3. Run trained ML models
        # ---------------------------------------------------------------

        prediction = predict_project(
            project=project,
            snapshot=snapshot,
        )

        # ---------------------------------------------------------------
        # 4. Return complete result
        # ---------------------------------------------------------------

        return {
            "success": True,

            "project": {
                "projectId": project.get(
                    "projectId"
                ),
                "projectName": project.get(
                    "projectName"
                ),
                "domain": project.get(
                    "domain"
                ),
                "state": project.get(
                    "state"
                ),
            },

            "snapshot": {
                "snapshotId": snapshot.get(
                    "id"
                ),
                "reportType": snapshot.get(
                    "reportType"
                ),
                "reportPeriod": snapshot.get(
                    "reportPeriod"
                ),
                "reportDate": str(
                    snapshot.get(
                        "reportDate"
                    )
                ),
            },

            "prediction": prediction,
        }

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error),
        )

    except FileNotFoundError as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )

    except Exception as error:

        print(
            "Prediction error:",
            repr(error),
        )

        raise HTTPException(
            status_code=500,
            detail="Prediction failed.",
        )



# ---------------------------------------------------------------------------
# Temporal Next-Month Progress Prediction
# ---------------------------------------------------------------------------

@app.get(
    "/api/predictions/project/{project_id}/next-month-progress"
)
def get_next_month_progress_prediction(
    project_id: str,
) -> Dict[str, Any]:

    project_id = project_id.strip()

    if not project_id:
        raise HTTPException(
            status_code=400,
            detail="Project ID is required.",
        )

    try:

        # ---------------------------------------------------------------
        # 1. Find project using business projectId
        # ---------------------------------------------------------------

        project = get_project_by_project_id(
            project_id
        )

        if project is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Project not found: "
                    f"{project_id}"
                ),
            )

        # ---------------------------------------------------------------
        # 2. Get latest snapshot
        # ---------------------------------------------------------------

        snapshot = (
            get_latest_project_snapshot(
                project_id
            )
        )

        if snapshot is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "No project snapshot found "
                    f"for project: {project_id}"
                ),
            )

        # ---------------------------------------------------------------
        # 3. Run temporal progress model
        # ---------------------------------------------------------------

        prediction = predict_next_month_progress(
            project=project,
            snapshot=snapshot,
        )

        # ---------------------------------------------------------------
        # 4. Return temporal prediction
        # ---------------------------------------------------------------

        return {
            "success": True,

            "predictionType": (
                "next_month_physical_progress"
            ),

            "project": {
                "projectId": project.get(
                    "projectId"
                ),
                "projectName": project.get(
                    "projectName"
                ),
                "domain": project.get(
                    "domain"
                ),
                "state": project.get(
                    "state"
                ),
            },

            "snapshot": {
                "snapshotId": snapshot.get(
                    "id"
                ),
                "reportType": snapshot.get(
                    "reportType"
                ),
                "reportPeriod": snapshot.get(
                    "reportPeriod"
                ),
                "reportDate": str(
                    snapshot.get(
                        "reportDate"
                    )
                ),
            },

            "prediction": prediction,
        }

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error),
        )

    except FileNotFoundError as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )

    except Exception as error:

        print(
            "Temporal progress prediction error:",
            repr(error),
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Temporal progress prediction failed."
            ),
        )

# ---------------------------------------------------------------------------
# What-If Prediction
# ---------------------------------------------------------------------------

@app.post(
    "/api/predictions/simulate"
)
def simulate_prediction(
    project_id: str,
    scenario: WhatIfScenario,
) -> Dict[str, Any]:

    project_id = project_id.strip()

    if not project_id:
        raise HTTPException(
            status_code=400,
            detail="Project ID is required.",
        )

    try:

        # ---------------------------------------------------------------
        # 1. Find the real project
        # ---------------------------------------------------------------

        project = get_project_by_project_id(
            project_id
        )

        if project is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Project not found: "
                    f"{project_id}"
                ),
            )

        # ---------------------------------------------------------------
        # 2. Get the latest real snapshot
        # ---------------------------------------------------------------

        snapshot = (
            get_latest_project_snapshot(
                project_id
            )
        )

        if snapshot is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "No project snapshot found "
                    f"for project: {project_id}"
                ),
            )

        # ---------------------------------------------------------------
        # 3. Create temporary snapshot
        #
        # IMPORTANT:
        # This is only an in-memory copy.
        # Nothing is written to Firestore.
        # ---------------------------------------------------------------

        simulated_snapshot = dict(
            snapshot
        )

        # ---------------------------------------------------------------
        # 4. Apply scenario changes
        # ---------------------------------------------------------------

        scenario_data = (
            scenario.model_dump(
                exclude_none=True
            )
        )

        for field, value in scenario_data.items():

            simulated_snapshot[field] = value

        # ---------------------------------------------------------------
        # 5. Validate milestone relationships
        # ---------------------------------------------------------------

        total_milestones = (
            simulated_snapshot.get(
                "totalMilestones"
            )
        )

        completed_milestones = (
            simulated_snapshot.get(
                "completedMilestones"
            )
        )

        delayed_milestones = (
            simulated_snapshot.get(
                "delayedMilestones"
            )
        )

        if (
            total_milestones is not None
            and completed_milestones is not None
            and completed_milestones > total_milestones
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Completed milestones "
                    "cannot exceed total milestones."
                ),
            )

        if (
            total_milestones is not None
            and delayed_milestones is not None
            and delayed_milestones > total_milestones
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Delayed milestones "
                    "cannot exceed total milestones."
                ),
            )

        # ---------------------------------------------------------------
        # 6. Run the EXISTING ML prediction engine
        #
        # No new model.
        # No retraining.
        # No Firestore write.
        # ---------------------------------------------------------------

        prediction = predict_project(
            project=project,
            snapshot=simulated_snapshot,
        )

        # ---------------------------------------------------------------
        # 7. Return scenario prediction
        # ---------------------------------------------------------------

        return {
            "success": True,

            "simulation": True,

            "project": {
                "projectId": project.get(
                    "projectId"
                ),
                "projectName": project.get(
                    "projectName"
                ),
                "domain": project.get(
                    "domain"
                ),
                "state": project.get(
                    "state"
                ),
            },

            "snapshot": {
                "snapshotId": snapshot.get(
                    "id"
                ),
                "reportType": snapshot.get(
                    "reportType"
                ),
                "reportPeriod": snapshot.get(
                    "reportPeriod"
                ),
                "reportDate": str(
                    snapshot.get(
                        "reportDate"
                    )
                ),
            },

            "prediction": prediction,

            "overrides": scenario_data,
        }

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error),
        )

    except FileNotFoundError as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )

    except Exception as error:

        print(
            "What-if prediction error:",
            repr(error),
        )

        raise HTTPException(
            status_code=500,
            detail="What-if prediction failed.",
        )



# ---------------------------------------------------------------------------
# AI Project Intelligence
# ---------------------------------------------------------------------------

@app.get(
    "/api/project-intelligence/{project_id}"
)
def get_project_intelligence(
    project_id: str,
) -> Dict[str, Any]:

    project_id = project_id.strip()

    if not project_id:
        raise HTTPException(
            status_code=400,
            detail="Project ID is required.",
        )

    try:

        # ---------------------------------------------------------------
        # 1. Get project
        # ---------------------------------------------------------------

        project = get_project_by_project_id(
            project_id
        )

        if project is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Project not found: "
                    f"{project_id}"
                ),
            )

        # ---------------------------------------------------------------
        # 2. Get latest snapshot
        # ---------------------------------------------------------------

        snapshot = (
            get_latest_project_snapshot(
                project_id
            )
        )

        if snapshot is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "No project snapshot found "
                    f"for project: {project_id}"
                ),
            )

        # ---------------------------------------------------------------
        # 3. Run existing ML prediction
        # ---------------------------------------------------------------

        prediction = predict_project(
            project=project,
            snapshot=snapshot,
        )

        # ---------------------------------------------------------------
        # 4. Build advisor project context
        # ---------------------------------------------------------------

        project_context = {
            **project,
            **snapshot,
        }

        # ---------------------------------------------------------------
        # 5. Generate grounded project intelligence
        # ---------------------------------------------------------------

        intelligence = (
            AIProjectAdvisor.generate_project_advice(
                project_data=project_context,
                predictions=prediction,
            )
        )

        # ---------------------------------------------------------------
        # 6. Return intelligence response
        # ---------------------------------------------------------------

        return {
            "success": True,

            "project": {
                "projectId":
                    project.get("projectId"),

                "projectName":
                    project.get("projectName"),

                "domain":
                    project.get("domain"),

                "state":
                    project.get("state"),
            },

            "snapshot": {
                "snapshotId":
                    snapshot.get("id"),

                "reportType":
                    snapshot.get("reportType"),

                "reportPeriod":
                    snapshot.get("reportPeriod"),

                "reportDate":
                    str(
                        snapshot.get(
                            "reportDate"
                        )
                    ),
            },

            "prediction":
                prediction,

            "intelligence":
                intelligence,
        }

    except HTTPException:
        raise

    except ValueError as error:

        raise HTTPException(
            status_code=422,
            detail=str(error),
        )

    except FileNotFoundError as error:

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )

    except Exception as error:

        print(
            "Project intelligence error:",
            repr(error),
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Project intelligence generation failed."
            ),
        )


# ---------------------------------------------------------------------------
# AI Project Intelligence Q&A
# ---------------------------------------------------------------------------

@app.post(
    "/api/project-intelligence/{project_id}/ask"
)
def ask_project_intelligence(
    project_id: str,
    request: ProjectIntelligenceQuery,
) -> Dict[str, Any]:

    project_id = project_id.strip()

    if not project_id:
        raise HTTPException(
            status_code=400,
            detail="Project ID is required.",
        )

    try:

        # ---------------------------------------------------------------
        # 1. Get project
        # ---------------------------------------------------------------

        project = get_project_by_project_id(
            project_id
        )

        if project is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Project not found: "
                    f"{project_id}"
                ),
            )

        # ---------------------------------------------------------------
        # 2. Get latest snapshot
        # ---------------------------------------------------------------

        snapshot = (
            get_latest_project_snapshot(
                project_id
            )
        )

        if snapshot is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "No project snapshot found "
                    f"for project: {project_id}"
                ),
            )

        # ---------------------------------------------------------------
        # 3. Run existing ML prediction
        # ---------------------------------------------------------------

        prediction = predict_project(
            project=project,
            snapshot=snapshot,
        )

        # ---------------------------------------------------------------
        # 4. Build grounded advisor context
        # ---------------------------------------------------------------

        project_context = {
            **project,
            **snapshot,
            "predictions": prediction,
        }

        # ---------------------------------------------------------------
        # 5. Ask the existing deterministic advisor
        # ---------------------------------------------------------------

        answer = (
            AIProjectAdvisor.answer_query(
                query=request.query,
                project_context=project_context,
            )
        )

        # ---------------------------------------------------------------
        # 6. Return answer
        # ---------------------------------------------------------------

        return {
            "success": True,

            "project": {
                "projectId":
                    project.get("projectId"),

                "projectName":
                    project.get("projectName"),

                "domain":
                    project.get("domain"),

                "state":
                    project.get("state"),
            },

            "query":
                request.query,

            "answer":
                answer,

            "prediction": {
                "predicted_delay_months":
                    prediction.get(
                        "predicted_delay_months"
                    ),

                "predicted_cost_overrun_pct":
                    prediction.get(
                        "predicted_cost_overrun_pct"
                    ),

                "predicted_cost_overrun_cr":
                    prediction.get(
                        "predicted_cost_overrun_cr"
                    ),

                "predicted_risk_score":
                    prediction.get(
                        "predicted_risk_score"
                    ),

                "risk_category":
                    prediction.get(
                        "risk_category"
                    ),
            },
        }

    except HTTPException:
        raise

    except ValueError as error:

        raise HTTPException(
            status_code=422,
            detail=str(error),
        )

    except FileNotFoundError as error:

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )

    except Exception as error:

        print(
            "Project intelligence Q&A error:",
            repr(error),
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Project intelligence Q&A failed."
            ),
        )


# ---------------------------------------------------------------------------
# Get Derived Metric for Project Snapshot
# ---------------------------------------------------------------------------

@app.get(
    "/api/projects/{project_id}/snapshots/{snapshot_id}/derived-metric"
)
def get_derived_metric_endpoint(
    project_id: str,
    snapshot_id: str,
) -> Dict[str, Any]:

    project_id = project_id.strip()
    snapshot_id = snapshot_id.strip()

    if not project_id:
        raise HTTPException(
            status_code=400,
            detail="Project ID is required.",
        )

    if not snapshot_id:
        raise HTTPException(
            status_code=400,
            detail="Snapshot ID is required.",
        )

    try:
        derived_metric = get_derived_metric_by_snapshot(
            project_id,
            snapshot_id,
        )

        if derived_metric is None:
            return {
                "success": True,
                "projectId": project_id,
                "snapshotId": snapshot_id,
                "derivedMetric": None,
            }

        return {
            "success": True,
            "projectId": project_id,
            "snapshotId": snapshot_id,
            "derivedMetric": derived_metric,
        }

    except Exception as error:
        print(
            "Get derived metric error:",
            repr(error),
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to fetch derived metric.",
        )