from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware

from backend.firebase.firestore_service import (
    get_latest_project_snapshot,
    get_project_by_project_id,
    get_all_projects as firestore_get_all_projects,
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