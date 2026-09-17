from typing import Any, Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.firebase.firestore_service import (
    get_latest_project_snapshot,
    get_project_by_project_id,
)

from backend.ml.prediction_engine import (
    get_model_status,
    predict_project,
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