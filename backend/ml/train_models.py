"""
NeevAI Temporal ML Training Pipeline

Experiment:
    Current project state
        ↓
    Next-month physical progress prediction

Training:
    May 2026 snapshot → June 2026 actual progress

Testing:
    June 2026 snapshot → July 2026 actual progress

IMPORTANT:
    - Uses only real PAIMANA-derived data.
    - No synthetic/default project data.
    - Uses a time-aware train/test split.
    - Does NOT overwrite the existing NeevAI delay/cost/risk models.
"""

import json
import os

import joblib
import pandas as pd

from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, r2_score


# ---------------------------------------------------------
# Paths
# ---------------------------------------------------------

CURRENT_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

BACKEND_DIR = os.path.dirname(CURRENT_DIR)

PROJECT_ROOT = os.path.dirname(BACKEND_DIR)

DATA_DIR = os.path.join(
    PROJECT_ROOT,
    "data",
    "processed",
)

MODELS_DIR = os.path.join(
    CURRENT_DIR,
    "models",
    "temporal",
)

DATASET_PATH = os.path.join(
    DATA_DIR,
    "paimana_temporal_feature_dataset_may_july_2026.csv",
)


# ---------------------------------------------------------
# Model configuration
# ---------------------------------------------------------

MODEL_VERSION = "temporal-progress-1.0.0"

TRAIN_MONTH = "2026-05"
TEST_MONTH = "2026-06"

TARGET_COLUMN = "next_month_physical_progress_pct"


# ---------------------------------------------------------
# Safe features
# ---------------------------------------------------------

SAFE_FEATURES = [
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


# ---------------------------------------------------------
# Dataset validation
# ---------------------------------------------------------

def validate_dataset(df: pd.DataFrame) -> None:

    required_columns = [
        "project_code",
        "report_month",
        TARGET_COLUMN,
        *SAFE_FEATURES,
    ]

    missing_columns = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            "Temporal dataset is missing required columns: "
            + ", ".join(missing_columns)
        )

    if df.empty:
        raise ValueError(
            "Temporal training dataset is empty."
        )


# ---------------------------------------------------------
# Prepare numeric data
# ---------------------------------------------------------

def prepare_numeric_data(
    df: pd.DataFrame,
) -> pd.DataFrame:

    df = df.copy()

    numeric_columns = [
        *SAFE_FEATURES,
        TARGET_COLUMN,
    ]

    for column in numeric_columns:
        df[column] = pd.to_numeric(
            df[column],
            errors="coerce",
        )

    return df


# ---------------------------------------------------------
# Train model
# ---------------------------------------------------------

def train_temporal_progress_model():

    print()
    print("=" * 70)
    print("NeevAI TEMPORAL PROGRESS MODEL")
    print("=" * 70)
    print()

    # -----------------------------------------------------
    # 1. Check dataset
    # -----------------------------------------------------

    print("[1/7] Checking temporal dataset...")

    if not os.path.exists(DATASET_PATH):

        raise FileNotFoundError(
            "Temporal PAIMANA dataset not found:\n"
            f"{DATASET_PATH}\n\n"
            "Make sure paimana_temporal_feature_dataset_may_july_2026.csv "
            "exists inside data/processed/."
        )

    df = pd.read_csv(
        DATASET_PATH
    )

    print(
        f"      Loaded {len(df):,} project-month records."
    )

    # -----------------------------------------------------
    # 2. Validate
    # -----------------------------------------------------

    print()
    print("[2/7] Validating dataset...")

    validate_dataset(df)

    df["report_month"] = (
        pd.to_datetime(
            df["report_month"],
            errors="coerce",
        )
        .dt.strftime("%Y-%m")
    )

    df = prepare_numeric_data(df)

    print(
        "      Dataset validation successful."
    )

    # -----------------------------------------------------
    # 3. Create time-aware train/test datasets
    # -----------------------------------------------------

    print()
    print("[3/7] Creating time-aware train/test split...")

    train_df = df[
        df["report_month"] == TRAIN_MONTH
    ].copy()

    test_df = df[
        df["report_month"] == TEST_MONTH
    ].copy()

    print(
        f"      Training month: {TRAIN_MONTH}"
    )

    print(
        f"      Testing month:  {TEST_MONTH}"
    )

    # -----------------------------------------------------
    # 4. Remove rows with unavailable model inputs
    # -----------------------------------------------------

    print()
    print("[4/7] Preparing model features...")

    train_df = train_df.dropna(
        subset=[
            *SAFE_FEATURES,
            TARGET_COLUMN,
        ]
    )

    test_df = test_df.dropna(
        subset=[
            *SAFE_FEATURES,
            TARGET_COLUMN,
        ]
    )

    if train_df.empty:
        raise ValueError(
            "No valid training records remain after "
            "removing missing feature/target values."
        )

    if test_df.empty:
        raise ValueError(
            "No valid testing records remain after "
            "removing missing feature/target values."
        )

    X_train = train_df[
        SAFE_FEATURES
    ]

    y_train = train_df[
        TARGET_COLUMN
    ]

    X_test = test_df[
        SAFE_FEATURES
    ]

    y_test = test_df[
        TARGET_COLUMN
    ]

    print(
        f"      Training records: {len(X_train):,}"
    )

    print(
        f"      Testing records:  {len(X_test):,}"
    )

    print(
        f"      Features: {len(SAFE_FEATURES)}"
    )

    # -----------------------------------------------------
    # 5. Train model
    # -----------------------------------------------------

    print()
    print("[5/7] Training progress prediction model...")

    model = GradientBoostingRegressor(
        n_estimators=220,
        learning_rate=0.05,
        max_depth=4,
        min_samples_split=5,
        min_samples_leaf=3,
        subsample=0.9,
        random_state=42,
    )

    model.fit(
        X_train,
        y_train,
    )

    print(
        "      Model training completed."
    )

    # -----------------------------------------------------
    # 6. Evaluate
    # -----------------------------------------------------

    print()
    print("[6/7] Evaluating on future-month data...")

    predictions = model.predict(
        X_test
    )

    r2 = r2_score(
        y_test,
        predictions,
    )

    mae = mean_absolute_error(
        y_test,
        predictions,
    )

    print()
    print(
        f"      R²  : {r2:.4f}"
    )

    print(
        f"      MAE : {mae:.2f} percentage points"
    )

    # -----------------------------------------------------
    # 7. Save model + metadata
    # -----------------------------------------------------

    print()
    print("[7/7] Saving temporal model...")

    os.makedirs(
        MODELS_DIR,
        exist_ok=True,
    )

    model_path = os.path.join(
        MODELS_DIR,
        "progress_model.joblib",
    )

    metadata_path = os.path.join(
        MODELS_DIR,
        "progress_model_metadata.json",
    )

    joblib.dump(
        model,
        model_path,
    )

    metadata = {
        "model_version": MODEL_VERSION,
        "project": "NeevAI",

        "task": (
            "Next-month physical progress prediction"
        ),

        "training_month": TRAIN_MONTH,

        "testing_month": TEST_MONTH,

        "dataset": (
            "paimana_temporal_feature_dataset_may_july_2026.csv"
        ),

        "training_records": int(
            len(X_train)
        ),

        "testing_records": int(
            len(X_test)
        ),

        "feature_count": len(
            SAFE_FEATURES
        ),

        "feature_columns": SAFE_FEATURES,

        "target": TARGET_COLUMN,

        "metrics": {
            "r2": float(r2),
            "mae_percentage_points": float(mae),
        },

        "data_policy": {
            "synthetic_data": False,
            "source": "PAIMANA",
            "time_aware_split": True,
        },

        "feature_importances": {
            feature: float(value)
            for feature, value in zip(
                SAFE_FEATURES,
                model.feature_importances_,
            )
        },
    }

    with open(
        metadata_path,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            metadata,
            file,
            indent=2,
        )

    print()
    print(
        "      Generated:"
    )

    print(
        "      ✓ progress_model.joblib"
    )

    print(
        "      ✓ progress_model_metadata.json"
    )

    print()
    print(
        f"      Saved to: {MODELS_DIR}"
    )

    print()
    print("=" * 70)
    print(
        "TEMPORAL MODEL TRAINING COMPLETED"
    )
    print("=" * 70)
    print()

    return metadata


# ---------------------------------------------------------
# Entry point
# ---------------------------------------------------------

if __name__ == "__main__":

    train_temporal_progress_model()