"""
NeevAI ML Prediction Engine
----------------------------

Production inference layer for the PAIMANA-trained ML models.

Flow:

    Firestore Project + ProjectSnapshot
                ↓
        Firestore → ML adapter
                ↓
      Existing feature_engineering.py
                ↓
          24-feature matrix
                ↓
        Trained .joblib models
                ↓
    Delay / Cost / Risk predictions
"""

import json
import os
from typing import Any, Dict

import joblib
import numpy as np
import pandas as pd

from .feature_engineering import get_feature_matrix


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

CURRENT_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

MODELS_DIR = os.path.join(
    CURRENT_DIR,
    "models",
)

TEMPORAL_MODELS_DIR = os.path.join(
    MODELS_DIR,
    "temporal",
)

TEMPORAL_PROGRESS_MODEL_PATH = os.path.join(
    TEMPORAL_MODELS_DIR,
    "progress_model.joblib",
)

TEMPORAL_PROGRESS_METADATA_PATH = os.path.join(
    TEMPORAL_MODELS_DIR,
    "progress_model_metadata.json",
)

DELAY_MODEL_PATH = os.path.join(
    MODELS_DIR,
    "delay_model.joblib",
)

COST_MODEL_PATH = os.path.join(
    MODELS_DIR,
    "cost_model.joblib",
)

RISK_MODEL_PATH = os.path.join(
    MODELS_DIR,
    "risk_model.joblib",
)

METADATA_PATH = os.path.join(
    MODELS_DIR,
    "model_metadata.json",
)


# ---------------------------------------------------------------------------
# Model cache
# ---------------------------------------------------------------------------

_delay_model = None
_cost_model = None
_risk_model = None
_model_metadata = None
_temporal_progress_model = None
_temporal_progress_metadata = None

# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------

def load_models() -> None:
    """
    Load all trained ML models and metadata.

    Models are loaded once and kept in memory
    for subsequent predictions.
    """

    global _delay_model
    global _cost_model
    global _risk_model
    global _model_metadata

    # Avoid loading models repeatedly.
    if (
        _delay_model is not None
        and _cost_model is not None
        and _risk_model is not None
    ):
        return

    # -----------------------------------------------------------------------
    # Validate model files
    # -----------------------------------------------------------------------

    if not os.path.exists(
        DELAY_MODEL_PATH
    ):
        raise FileNotFoundError(
            f"Delay model not found: {DELAY_MODEL_PATH}"
        )

    if not os.path.exists(
        COST_MODEL_PATH
    ):
        raise FileNotFoundError(
            f"Cost model not found: {COST_MODEL_PATH}"
        )

    if not os.path.exists(
        RISK_MODEL_PATH
    ):
        raise FileNotFoundError(
            f"Risk model not found: {RISK_MODEL_PATH}"
        )

    # -----------------------------------------------------------------------
    # Load trained models
    # -----------------------------------------------------------------------

    _delay_model = joblib.load(
        DELAY_MODEL_PATH
    )

    _cost_model = joblib.load(
        COST_MODEL_PATH
    )

    _risk_model = joblib.load(
        RISK_MODEL_PATH
    )

    # -----------------------------------------------------------------------
    # Load model metadata
    # -----------------------------------------------------------------------

    if os.path.exists(
        METADATA_PATH
    ):
        with open(
            METADATA_PATH,
            "r",
            encoding="utf-8",
        ) as file:
            _model_metadata = json.load(
                file
            )
    else:
        _model_metadata = {}


TEMPORAL_PROGRESS_FEATURES = [
    "original_cost_cr",
    "revised_cost_cr",
    "cumulative_expenditure_cr",
    "physical_progress_pct",
    "cost_revision_pct",
    "expenditure_to_revised_cost_pct",
    "physical_minus_financial_progress_proxy_pct",
    "planned_duration_months",
    "elapsed_duration_months",
    "elapsed_planned_duration_ratio",
]

def load_temporal_progress_model():
    """
    Safely load the temporal next-month progress model.

    This is intentionally separate from the legacy delay/cost/risk
    models so the existing prediction pipeline remains unchanged.
    """

    global _temporal_progress_model
    global _temporal_progress_metadata

    if (
        _temporal_progress_model is not None
        and _temporal_progress_metadata is not None
    ):
        return (
            _temporal_progress_model,
            _temporal_progress_metadata,
        )

    if not os.path.exists(TEMPORAL_PROGRESS_MODEL_PATH):
        raise FileNotFoundError(
            "Temporal progress model not found: "
            f"{TEMPORAL_PROGRESS_MODEL_PATH}"
        )

    if not os.path.exists(TEMPORAL_PROGRESS_METADATA_PATH):
        raise FileNotFoundError(
            "Temporal progress model metadata not found: "
            f"{TEMPORAL_PROGRESS_METADATA_PATH}"
        )

    model = joblib.load(TEMPORAL_PROGRESS_MODEL_PATH)

    with open(
        TEMPORAL_PROGRESS_METADATA_PATH,
        "r",
        encoding="utf-8",
    ) as file:
        metadata = json.load(file)

    if not isinstance(metadata, dict):
        raise ValueError(
            "Temporal progress model metadata must be a JSON object."
        )

    feature_columns = metadata.get("feature_columns")

    if not isinstance(feature_columns, list):
        raise ValueError(
            "Temporal progress model metadata is missing "
            "'feature_columns'."
        )

    if len(feature_columns) != 10:
        raise ValueError(
            "Temporal progress model must use exactly 10 features. "
            f"Found: {len(feature_columns)}"
        )

    _temporal_progress_model = model
    _temporal_progress_metadata = metadata

    return (
        _temporal_progress_model,
        _temporal_progress_metadata,
    )


def build_temporal_progress_input(
    project: Dict[str, Any],
    snapshot: Dict[str, Any],
) -> pd.DataFrame:
    """
    Build the exact 10-feature input required by the
    temporal next-month physical-progress model.
    """

    def required_float(
        value: Any,
        field_name: str,
    ) -> float:
        number = _to_float(value)

        if number is None:
            raise ValueError(
                f"Temporal prediction requires '{field_name}'."
            )

        return float(number)

    original_cost = (
        snapshot.get("originalCostCr")
        if snapshot.get("originalCostCr") is not None
        else project.get("originalCostCr")
    )

    revised_cost = (
        snapshot.get("revisedCostCr")
        if snapshot.get("revisedCostCr") is not None
        else original_cost
    )

    expenditure = required_float(
        snapshot.get("cumulativeExpenditureCr"),
        "cumulativeExpenditureCr",
    )

    physical_progress = required_float(
        snapshot.get("physicalProgressPct"),
        "physicalProgressPct",
    )

    original_cost = required_float(
        original_cost,
        "originalCostCr",
    )

    revised_cost = required_float(
        revised_cost,
        "revisedCostCr",
    )

    if original_cost <= 0:
        raise ValueError(
            "Original cost must be greater than 0."
        )

    if revised_cost <= 0:
        raise ValueError(
            "Revised cost must be greater than 0."
        )

    if expenditure < 0:
        raise ValueError(
            "Cumulative expenditure cannot be negative."
        )

    if not 0 <= physical_progress <= 100:
        raise ValueError(
            "Physical progress must be between 0 and 100."
        )

    # Financial progress proxy.
    financial_progress = (
        expenditure / revised_cost
    ) * 100.0

    # Cost revision percentage.
    cost_revision_pct = (
        (revised_cost - original_cost)
        / original_cost
    ) * 100.0

    # Difference between physical and financial progress.
    physical_minus_financial_progress_proxy_pct = (
        physical_progress - financial_progress
    )

    # Expenditure as a percentage of revised cost.
    expenditure_to_revised_cost_pct = (
        expenditure / revised_cost
    ) * 100.0

    # Resolve project dates.
    approval_date = project.get("approvalDate")
    start_date = project.get("startDate")

    completion_date = (
        snapshot.get("originalCompletionDate")
        if snapshot.get("originalCompletionDate") is not None
        else project.get("originalCompletionDate")
    )

    report_date = snapshot.get("reportDate")

    def parse_date(value: Any):
        if value is None:
            return None

        if isinstance(value, str):
            parsed = pd.to_datetime(
                value,
                errors="coerce",
            )

            if pd.isna(parsed):
                return None

            return parsed

        if isinstance(value, dict):
            seconds = value.get("seconds")

            if seconds is not None:
                return pd.to_datetime(
                    int(seconds),
                    unit="s",
                    errors="coerce",
                )

        return None

    start_dt = parse_date(start_date)
    approval_dt = parse_date(approval_date)
    completion_dt = parse_date(completion_date)
    report_dt = parse_date(report_date)

    # Use actual project start date first.
    if start_dt is None:
        start_dt = approval_dt

    if start_dt is None:
        raise ValueError(
            "Temporal prediction requires project start date."
        )

    if report_dt is None:
        raise ValueError(
            "Temporal prediction requires snapshot report date."
        )

    if completion_dt is None:
        raise ValueError(
            "Temporal prediction requires original completion date."
        )

    planned_duration_days = (
        completion_dt - start_dt
    ).days

    elapsed_duration_days = (
        report_dt - start_dt
    ).days

    if planned_duration_days <= 0:
        raise ValueError(
            "Project planned duration must be greater than 0."
        )

    planned_duration_months = (
        planned_duration_days / 30.4375
    )

    elapsed_duration_months = max(
        0.0,
        elapsed_duration_days / 30.4375,
    )

    elapsed_planned_duration_ratio = (
        elapsed_duration_months
        / planned_duration_months
    )

    row = {
        "original_cost_cr": original_cost,
        "revised_cost_cr": revised_cost,
        "cumulative_expenditure_cr": expenditure,
        "physical_progress_pct": physical_progress,
        "cost_revision_pct": cost_revision_pct,
        "expenditure_to_revised_cost_pct": (
            expenditure_to_revised_cost_pct
        ),
        "physical_minus_financial_progress_proxy_pct": (
            physical_minus_financial_progress_proxy_pct
        ),
        "planned_duration_months": (
            planned_duration_months
        ),
        "elapsed_duration_months": (
            elapsed_duration_months
        ),
        "elapsed_planned_duration_ratio": (
            elapsed_planned_duration_ratio
        ),
    }

    return pd.DataFrame(
        [row],
        columns=TEMPORAL_PROGRESS_FEATURES,
    )

def predict_next_month_progress(
    project: Dict[str, Any],
    snapshot: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Predict the project's physical progress for the next month
    using the temporal progress model.
    """

    model, metadata = load_temporal_progress_model()

    feature_df = build_temporal_progress_input(
        project,
        snapshot,
    )

    expected_features = metadata.get(
        "feature_columns",
        TEMPORAL_PROGRESS_FEATURES,
    )

    if expected_features != TEMPORAL_PROGRESS_FEATURES:
        raise ValueError(
            "Temporal model feature schema mismatch. "
            f"Expected: {TEMPORAL_PROGRESS_FEATURES}, "
            f"Found: {expected_features}"
        )

    prediction = model.predict(feature_df)

    if prediction is None or len(prediction) == 0:
        raise ValueError(
            "Temporal progress model returned no prediction."
        )

    predicted_progress = float(prediction[0])

    # Physical progress is always bounded between 0 and 100.
    predicted_progress = max(
        0.0,
        min(100.0, predicted_progress),
    )

    current_progress = float(
        feature_df["physical_progress_pct"].iloc[0]
    )

    predicted_progress_change = (
        predicted_progress - current_progress
    )

    return {
        "predicted_next_month_physical_progress_pct": round(
            predicted_progress,
            2,
        ),
        "predicted_progress_change_pct": round(
            predicted_progress_change,
            2,
        ),
        "current_physical_progress_pct": round(
            current_progress,
            2,
        ),
        "model_version": metadata.get(
            "model_version",
            "unknown",
        ),
        "feature_count": len(
            TEMPORAL_PROGRESS_FEATURES
        ),
        "feature_columns": TEMPORAL_PROGRESS_FEATURES,
    }




# ---------------------------------------------------------------------------
# Numeric helpers
# ---------------------------------------------------------------------------

def _to_float(
    value: Any,
) -> float | None:
    """
    Convert a value to float.

    Returns None when the value is missing
    or invalid.

    IMPORTANT:
    Missing real-world data is NOT converted
    into an artificial numeric value.
    """

    if value is None:
        return None

    if isinstance(
        value,
        str,
    ) and value.strip() == "":
        return None

    try:
        result = float(value)

        if not np.isfinite(result):
            return None

        return result

    except (
        TypeError,
        ValueError,
    ):
        return None


def _to_int(
    value: Any,
) -> int | None:
    """
    Convert a value to integer.

    Returns None when the value is missing
    or invalid.
    """

    if value is None:
        return None

    if isinstance(
        value,
        str,
    ) and value.strip() == "":
        return None

    try:
        result = int(
            float(value)
        )

        return result

    except (
        TypeError,
        ValueError,
    ):
        return None


# ---------------------------------------------------------------------------
# Required field validation
# ---------------------------------------------------------------------------

def _validate_required_ml_fields(
    values: Dict[str, Any],
) -> None:
    """
    Ensure all ML operational fields required by
    the trained model are actually available.

    We intentionally do NOT fabricate missing
    government/project values.
    """

    missing_fields = [
        field
        for field, value in values.items()
        if value is None
    ]

    if missing_fields:
        raise ValueError(
            "ML prediction unavailable. "
            "Missing real project execution data: "
            + ", ".join(missing_fields)
        )


# ---------------------------------------------------------------------------
# Sector mapping
# ---------------------------------------------------------------------------

def _map_sector(
    project: Dict[str, Any],
) -> str:
    """
    Convert NeevAI's domain terminology into the
    sector terminology used during ML training.

    Only verified mappings are allowed.

    We do NOT invent a Healthcare encoding.
    """

    raw_sector = (
        project.get("domain")
        or project.get("sector")
    )

    if not raw_sector:
        raise ValueError(
            "ML prediction unavailable. "
            "Project domain is missing."
        )

    sector_mapping = {
        "Roads & Highways":
            "Road Transport & Highways",

        "Road Transport & Highways":
            "Road Transport & Highways",
    }

    mapped_sector = sector_mapping.get(
        raw_sector
    )

    if mapped_sector is None:
        raise ValueError(
            f"ML prediction unavailable for sector: "
            f"{raw_sector}. "
            "No verified training mapping exists "
            "for this sector."
        )

    return mapped_sector


# ---------------------------------------------------------------------------
# Firestore → ML input adapter
# ---------------------------------------------------------------------------

def build_ml_input(
    project: Dict[str, Any],
    snapshot: Dict[str, Any],
) -> pd.DataFrame:
    """
    Convert NeevAI Firestore Project and
    ProjectSnapshot data into the exact raw
    snake_case structure expected by the
    existing feature engineering pipeline.

    This function does NOT modify the original
    feature engineering implementation.
    """

    # -----------------------------------------------------------------------
    # Project cost
    # -----------------------------------------------------------------------

    original_cost_cr = _to_float(
        snapshot.get(
            "originalCostCr"
        )
    )

    if original_cost_cr is None:
        original_cost_cr = _to_float(
            project.get(
                "originalCostCr"
            )
        )

    if (
        original_cost_cr is None
        or original_cost_cr <= 0
    ):
        raise ValueError(
            "ML prediction unavailable. "
            "A valid original project cost is required."
        )

    # -----------------------------------------------------------------------
    # Revised cost
    # -----------------------------------------------------------------------

    revised_cost_cr = _to_float(
        snapshot.get(
            "revisedCostCr"
        )
    )

    # If no revised cost is reported,
    # original sanctioned cost is used.
    #
    # This is a legitimate business fallback,
    # not fabricated project data.
    if (
        revised_cost_cr is None
        or revised_cost_cr <= 0
    ):
        revised_cost_cr = original_cost_cr

    # -----------------------------------------------------------------------
    # Financial data
    # -----------------------------------------------------------------------

    cumulative_expenditure_cr = _to_float(
        snapshot.get(
            "cumulativeExpenditureCr"
        )
    )

    if cumulative_expenditure_cr is None:
        raise ValueError(
            "ML prediction unavailable. "
            "Cumulative expenditure is required."
        )

    # -----------------------------------------------------------------------
    # Physical progress
    # -----------------------------------------------------------------------

    physical_progress_pct = _to_float(
        snapshot.get(
            "physicalProgressPct"
        )
    )

    if physical_progress_pct is None:
        raise ValueError(
            "ML prediction unavailable. "
            "Physical progress is required."
        )

    if not (
        0 <= physical_progress_pct <= 100
    ):
        raise ValueError(
            "Physical progress must be "
            "between 0 and 100."
        )

    # -----------------------------------------------------------------------
    # Financial progress
    # -----------------------------------------------------------------------
    #
    # The original ML pipeline expects
    # financial_progress_pct.
    #
    # NeevAI does not store this as a separate
    # snapshot field because it can be derived
    # from actual expenditure and project cost.
    # -----------------------------------------------------------------------

    if revised_cost_cr <= 0:
        raise ValueError(
            "ML prediction unavailable. "
            "Project cost must be greater than zero."
        )

    financial_progress_pct = (
        cumulative_expenditure_cr
        / revised_cost_cr
    ) * 100.0

    # -----------------------------------------------------------------------
    # ML operational inputs
    # -----------------------------------------------------------------------

    total_milestones = _to_int(
        snapshot.get(
            "totalMilestones"
        )
    )

    completed_milestones = _to_int(
        snapshot.get(
            "completedMilestones"
        )
    )

    delayed_milestones = _to_int(
        snapshot.get(
            "delayedMilestones"
        )
    )

    land_acquisition_delay_months = _to_float(
        snapshot.get(
            "landAcquisitionDelayMonths"
        )
    )

    clearance_delay_months = _to_float(
        snapshot.get(
            "clearanceDelayMonths"
        )
    )

    contractor_delay_score = _to_float(
        snapshot.get(
            "contractorDelayScore"
        )
    )

    geological_delay_score = _to_float(
        snapshot.get(
            "geologicalDelayScore"
        )
    )

    # -----------------------------------------------------------------------
    # Validate all real ML inputs
    # -----------------------------------------------------------------------

    required_ml_fields = {
        "totalMilestones":
            total_milestones,

        "completedMilestones":
            completed_milestones,

        "delayedMilestones":
            delayed_milestones,

        "landAcquisitionDelayMonths":
            land_acquisition_delay_months,

        "clearanceDelayMonths":
            clearance_delay_months,

        "contractorDelayScore":
            contractor_delay_score,

        "geologicalDelayScore":
            geological_delay_score,
    }

    _validate_required_ml_fields(
        required_ml_fields
    )

    # -----------------------------------------------------------------------
    # Logical validation
    # -----------------------------------------------------------------------

    if total_milestones <= 0:
        raise ValueError(
            "Total milestones must be "
            "greater than zero."
        )

    if completed_milestones < 0:
        raise ValueError(
            "Completed milestones cannot "
            "be negative."
        )

    if (
        completed_milestones
        > total_milestones
    ):
        raise ValueError(
            "Completed milestones cannot "
            "exceed total milestones."
        )

    if delayed_milestones < 0:
        raise ValueError(
            "Delayed milestones cannot "
            "be negative."
        )

    if (
        delayed_milestones
        > total_milestones
    ):
        raise ValueError(
            "Delayed milestones cannot "
            "exceed total milestones."
        )

    if (
        land_acquisition_delay_months < 0
    ):
        raise ValueError(
            "Land acquisition delay "
            "cannot be negative."
        )

    if clearance_delay_months < 0:
        raise ValueError(
            "Clearance delay cannot "
            "be negative."
        )

    if contractor_delay_score < 0:
        raise ValueError(
            "Contractor delay score "
            "cannot be negative."
        )

    if geological_delay_score < 0:
        raise ValueError(
            "Geological delay score "
            "cannot be negative."
        )

    # -----------------------------------------------------------------------
    # Sector
    # -----------------------------------------------------------------------

    sector = _map_sector(
        project
    )

    # -----------------------------------------------------------------------
    # State
    # -----------------------------------------------------------------------

    state_location = project.get(
        "state"
    )

    if not state_location:
        raise ValueError(
            "ML prediction unavailable. "
            "Project state is missing."
        )

    # -----------------------------------------------------------------------
    # Final raw ML row
    # -----------------------------------------------------------------------

    row = {
        "original_cost_cr":
            original_cost_cr,

        "revised_cost_cr":
            revised_cost_cr,

        "cumulative_expenditure_cr":
            cumulative_expenditure_cr,

        "physical_progress_pct":
            physical_progress_pct,

        "financial_progress_pct":
            financial_progress_pct,

        "total_milestones":
            total_milestones,

        "completed_milestones":
            completed_milestones,

        "delayed_milestones":
            delayed_milestones,

        "land_acquisition_delay_months":
            land_acquisition_delay_months,

        "clearance_delay_months":
            clearance_delay_months,

        "contractor_delay_score":
            contractor_delay_score,

        "geological_delay_score":
            geological_delay_score,

        "sector":
            sector,

        "state_location":
            state_location,
    }

    return pd.DataFrame(
        [row]
    )


# ---------------------------------------------------------------------------
# Prediction
# ---------------------------------------------------------------------------

def predict_project(
    project: Dict[str, Any],
    snapshot: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Run the existing trained PAIMANA ML models
    against one real NeevAI project snapshot.

    Returns:

        predicted_delay_months
        predicted_cost_overrun_pct
        predicted_cost_overrun_cr
        predicted_risk_score
        risk_category
        model_version
        feature_count
    """

    # -----------------------------------------------------------------------
    # Load models
    # -----------------------------------------------------------------------

    load_models()

    # -----------------------------------------------------------------------
    # Build ML input
    # -----------------------------------------------------------------------

    ml_input = build_ml_input(
        project=project,
        snapshot=snapshot,
    )

    # -----------------------------------------------------------------------
    # Existing feature engineering
    # -----------------------------------------------------------------------

    feature_matrix = get_feature_matrix(
        ml_input
    )

    # -----------------------------------------------------------------------
    # Validate feature count
    # -----------------------------------------------------------------------

    expected_feature_count = 24

    if (
        feature_matrix.shape[1]
        != expected_feature_count
    ):
        raise ValueError(
            "Feature engineering returned "
            f"{feature_matrix.shape[1]} features, "
            f"but the trained models expect "
            f"{expected_feature_count}."
        )

    # -----------------------------------------------------------------------
    # Delay prediction
    # -----------------------------------------------------------------------

    predicted_delay = float(
        _delay_model.predict(
            feature_matrix
        )[0]
    )

    # -----------------------------------------------------------------------
    # Cost overrun prediction
    # -----------------------------------------------------------------------

    predicted_cost_overrun_pct = float(
        _cost_model.predict(
            feature_matrix
        )[0]
    )

    # -----------------------------------------------------------------------
    # Risk prediction
    # -----------------------------------------------------------------------

    predicted_risk_score = float(
        _risk_model.predict(
            feature_matrix
        )[0]
    )

    # -----------------------------------------------------------------------
    # Safety bounds
    # -----------------------------------------------------------------------
    #
    # These bounds only prevent impossible
    # presentation values.
    #
    # The trained models themselves are not
    # modified.
    # -----------------------------------------------------------------------

    predicted_delay = float(
        np.round(
            np.clip(
                predicted_delay,
                0.0,
                72.0,
            ),
            1,
        )
    )

    predicted_cost_overrun_pct = float(
        np.round(
            np.clip(
                predicted_cost_overrun_pct,
                0.0,
                80.0,
            ),
            2,
        )
    )

    predicted_risk_score = float(
        np.round(
            np.clip(
                predicted_risk_score,
                10.0,
                99.0,
            ),
            1,
        )
    )

    # -----------------------------------------------------------------------
    # Predicted cost overrun in ₹ Crore
    # -----------------------------------------------------------------------

    project_cost_cr = _to_float(
        snapshot.get(
            "revisedCostCr"
        )
    )

    if (
        project_cost_cr is None
        or project_cost_cr <= 0
    ):
        project_cost_cr = _to_float(
            snapshot.get(
                "originalCostCr"
            )
        )

    if (
        project_cost_cr is None
        or project_cost_cr <= 0
    ):
        project_cost_cr = _to_float(
            project.get(
                "originalCostCr"
            )
        )

    if (
        project_cost_cr is None
        or project_cost_cr <= 0
    ):
        raise ValueError(
            "Unable to calculate predicted "
            "cost overrun amount because "
            "project cost is unavailable."
        )

    predicted_cost_overrun_cr = float(
        np.round(
            project_cost_cr
            * (
                predicted_cost_overrun_pct
                / 100.0
            ),
            2,
        )
    )

    # -----------------------------------------------------------------------
    # Risk category
    # -----------------------------------------------------------------------

    if predicted_risk_score >= 75:
        risk_category = "CRITICAL"

    elif predicted_risk_score >= 50:
        risk_category = "HIGH"

    elif predicted_risk_score >= 25:
        risk_category = "MEDIUM"

    else:
        risk_category = "LOW"

    # -----------------------------------------------------------------------
    # Model metadata
    # -----------------------------------------------------------------------

    model_version = None
    feature_count = expected_feature_count

    if _model_metadata:

        model_version = (
            _model_metadata.get(
                "version"
            )
        )

        metadata_features = (
            _model_metadata.get(
                "feature_columns"
            )
        )

        if isinstance(
            metadata_features,
            list,
        ):
            feature_count = len(
                metadata_features
            )

    # -----------------------------------------------------------------------
    # Final prediction result
    # -----------------------------------------------------------------------

    return {
        "predicted_delay_months":
            predicted_delay,

        "predicted_cost_overrun_pct":
            predicted_cost_overrun_pct,

        "predicted_cost_overrun_cr":
            predicted_cost_overrun_cr,

        "predicted_risk_score":
            predicted_risk_score,

        "risk_category":
            risk_category,

        "model_version":
            model_version,

        "feature_count":
            feature_count,
    }


# ---------------------------------------------------------------------------
# Model diagnostics
# ---------------------------------------------------------------------------

def get_model_status() -> Dict[str, Any]:
    """
    Return model availability information.

    Used by the FastAPI health endpoint.
    """

    return {
        "delay_model":
            os.path.exists(
                DELAY_MODEL_PATH
            ),

        "cost_model":
            os.path.exists(
                COST_MODEL_PATH
            ),

        "risk_model":
            os.path.exists(
                RISK_MODEL_PATH
            ),

        "metadata":
            os.path.exists(
                METADATA_PATH
            ),

        "models_directory":
            MODELS_DIR,
    }

if __name__ == "__main__":
    print("\n=== Temporal Progress Prediction Test ===\n")

    test_project = {
        "projectId": "TEST-617887",
        "projectName": "Temporal Model Test Project",
        "domain": "Roads & Highways",
        "originalCostCr": 379.23,
        "startDate": "2020-12-01",
        "approvalDate": "2020-12-01",
        "originalCompletionDate": "2023-10-01",
    }

    test_snapshot = {
        "projectId": "TEST-617887",
        "reportType": "Monthly",
        "reportPeriod": "January 2026",
        "reportDate": "2026-01-31",
        "originalCostCr": 379.23,
        "revisedCostCr": 379.23,
        "cumulativeExpenditureCr": 179.08,
        "physicalProgressPct": 98.0,
        "originalCompletionDate": "2023-10-01",
    }

    try:
        result = predict_next_month_progress(
            project=test_project,
            snapshot=test_snapshot,
        )

        print("Temporal prediction successful.\n")

        print(
            "Current physical progress:",
            result[
                "current_physical_progress_pct"
            ],
        )

        print(
            "Predicted next-month physical progress:",
            result[
                "predicted_next_month_physical_progress_pct"
            ],
        )

        print(
            "Predicted progress change:",
            result[
                "predicted_progress_change_pct"
            ],
        )

        print(
            "Model version:",
            result["model_version"],
        )

        print(
            "Feature count:",
            result["feature_count"],
        )

    except Exception as error:
        print(
            "\nTemporal prediction test failed:",
            str(error),
        )