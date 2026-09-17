"""
NeevAI Model Training Pipeline

Trains:
1. Delay Prediction Model
2. Cost Overrun Prediction Model
3. Risk Score Model

Uses the exact 24-feature engineering pipeline from
backend/ml/feature_engineering.py.

Training data must come from a real PAIMANA dataset.
No synthetic/default project data is generated here.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import (
    GradientBoostingRegressor,
    RandomForestRegressor,
)

from sklearn.model_selection import train_test_split

from sklearn.metrics import (
    mean_absolute_error,
    r2_score,
)

from .feature_engineering import (
    get_feature_matrix,
    FEATURE_COLUMNS,
)


# ---------------------------------------------------------
# Paths
# ---------------------------------------------------------

CURRENT_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

BACKEND_DIR = os.path.dirname(
    CURRENT_DIR
)

PROJECT_ROOT = os.path.dirname(
    BACKEND_DIR
)

DATA_DIR = os.path.join(
    PROJECT_ROOT,
    "data",
)

MODELS_DIR = os.path.join(
    CURRENT_DIR,
    "models",
)

DATASET_PATH = os.path.join(
    DATA_DIR,
    "paimana_master_dataset.csv",
)


# ---------------------------------------------------------
# Required training columns
# ---------------------------------------------------------

REQUIRED_COLUMNS = [
    "original_cost_cr",
    "revised_cost_cr",
    "cumulative_expenditure_cr",
    "physical_progress_pct",
    "financial_progress_pct",

    "total_milestones",
    "completed_milestones",
    "delayed_milestones",

    "land_acquisition_delay_months",
    "clearance_delay_months",

    "contractor_delay_score",
    "geological_delay_score",

    "sector",
    "state_location",

    "target_time_delay_months",
    "target_cost_overrun_pct",
    "target_risk_score",
]


# ---------------------------------------------------------
# Validate dataset
# ---------------------------------------------------------

def validate_dataset(df: pd.DataFrame) -> None:
    """
    Validate that the real training dataset contains
    everything required by the ML pipeline.
    """

    missing_columns = [
        column
        for column in REQUIRED_COLUMNS
        if column not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            "Training dataset is missing required columns: "
            + ", ".join(missing_columns)
        )

    if len(df) < 20:
        raise ValueError(
            "Training dataset contains too few records. "
            f"Found {len(df)} records; at least 20 are required."
        )

    if df["sector"].isna().any():
        raise ValueError(
            "Training dataset contains missing sector values."
        )

    if df["state_location"].isna().any():
        raise ValueError(
            "Training dataset contains missing state_location values."
        )


# ---------------------------------------------------------
# Validate sector vocabulary
# ---------------------------------------------------------

def validate_sectors(df: pd.DataFrame) -> None:
    """
    Make sure every sector in the training data is supported
    by feature_engineering.py.
    """

    from .feature_engineering import SECTOR_MAP

    dataset_sectors = set(
        df["sector"]
        .dropna()
        .astype(str)
        .str.strip()
        .unique()
    )

    supported_sectors = set(
        SECTOR_MAP.keys()
    )

    unsupported = sorted(
        dataset_sectors - supported_sectors
    )

    if unsupported:
        raise ValueError(
            "Unsupported sectors found in training dataset: "
            + ", ".join(unsupported)
            + ". Add their verified mappings to "
              "feature_engineering.py before training."
        )


# ---------------------------------------------------------
# Clean numeric columns
# ---------------------------------------------------------

def prepare_numeric_columns(
    df: pd.DataFrame,
) -> pd.DataFrame:

    df = df.copy()

    numeric_columns = [
        "original_cost_cr",
        "revised_cost_cr",
        "cumulative_expenditure_cr",
        "physical_progress_pct",
        "financial_progress_pct",

        "total_milestones",
        "completed_milestones",
        "delayed_milestones",

        "land_acquisition_delay_months",
        "clearance_delay_months",

        "contractor_delay_score",
        "geological_delay_score",

        "target_time_delay_months",
        "target_cost_overrun_pct",
        "target_risk_score",
    ]

    for column in numeric_columns:
        df[column] = pd.to_numeric(
            df[column],
            errors="coerce",
        )

    if df[numeric_columns].isna().any().any():
        invalid_columns = (
            df[numeric_columns]
            .columns[
                df[numeric_columns]
                .isna()
                .any()
            ]
            .tolist()
        )

        raise ValueError(
            "Invalid or missing numeric values found in: "
            + ", ".join(invalid_columns)
        )

    return df


# ---------------------------------------------------------
# Train models
# ---------------------------------------------------------

def train_and_save_models():

    print()
    print("=" * 60)
    print("NeevAI ML MODEL TRAINING")
    print("=" * 60)
    print()

    # -----------------------------------------------------
    # Check dataset
    # -----------------------------------------------------

    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(
            "Real PAIMANA training dataset not found:\n"
            f"{DATASET_PATH}\n\n"
            "Place the verified dataset at this location "
            "before training."
        )

    print(
        "[1/7] Loading training dataset..."
    )

    df = pd.read_csv(
        DATASET_PATH
    )

    print(
        f"      Loaded {len(df)} project records."
    )

    # -----------------------------------------------------
    # Validate
    # -----------------------------------------------------

    print(
        "[2/7] Validating dataset..."
    )

    validate_dataset(df)

    validate_sectors(df)

    df = prepare_numeric_columns(df)

    print(
        "      Dataset validation successful."
    )

    print()
    print(
        "      Sector distribution:"
    )

    sector_counts = (
        df["sector"]
        .value_counts()
    )

    for sector, count in sector_counts.items():
        print(
            f"      - {sector}: {count}"
        )

    # -----------------------------------------------------
    # Feature engineering
    # -----------------------------------------------------

    print()
    print(
        "[3/7] Engineering 24 ML features..."
    )

    X = get_feature_matrix(
        df
    )

    print(
        f"      Feature matrix shape: {X.shape}"
    )

    if X.shape[1] != len(
        FEATURE_COLUMNS
    ):
        raise ValueError(
            "Feature count mismatch. "
            f"Expected {len(FEATURE_COLUMNS)}, "
            f"got {X.shape[1]}."
        )

    # -----------------------------------------------------
    # Targets
    # -----------------------------------------------------

    print(
        "[4/7] Preparing prediction targets..."
    )

    y_delay = (
        df["target_time_delay_months"]
        .values
    )

    y_cost = (
        df["target_cost_overrun_pct"]
        .values
    )

    y_risk = (
        df["target_risk_score"]
        .values
    )

    # -----------------------------------------------------
    # Train / test split
    # -----------------------------------------------------

    print(
        "[5/7] Creating train/test split..."
    )

    (
        X_train,
        X_test,
        y_delay_train,
        y_delay_test,
        y_cost_train,
        y_cost_test,
        y_risk_train,
        y_risk_test,
    ) = train_test_split(
        X,
        y_delay,
        y_cost,
        y_risk,
        test_size=0.18,
        random_state=42,
    )

    print(
        f"      Training records: {len(X_train)}"
    )

    print(
        f"      Testing records:  {len(X_test)}"
    )

    # -----------------------------------------------------
    # Delay model
    # -----------------------------------------------------

    print()
    print(
        "[6/7] Training models..."
    )

    print(
        "      Training Delay Predictor..."
    )

    delay_model = GradientBoostingRegressor(
        n_estimators=220,
        learning_rate=0.06,
        max_depth=5,
        min_samples_split=4,
        min_samples_leaf=2,
        subsample=0.9,
        random_state=42,
    )

    delay_model.fit(
        X_train,
        y_delay_train,
    )

    delay_prediction = (
        delay_model.predict(
            X_test
        )
    )

    delay_r2 = r2_score(
        y_delay_test,
        delay_prediction,
    )

    delay_mae = mean_absolute_error(
        y_delay_test,
        delay_prediction,
    )

    print(
        f"      Delay R²: {delay_r2:.4f}"
    )

    print(
        f"      Delay MAE: {delay_mae:.2f} months"
    )

    # -----------------------------------------------------
    # Cost model
    # -----------------------------------------------------

    print(
        "      Training Cost Overrun Predictor..."
    )

    cost_model = GradientBoostingRegressor(
        n_estimators=200,
        learning_rate=0.06,
        max_depth=5,
        min_samples_split=4,
        min_samples_leaf=2,
        subsample=0.9,
        random_state=42,
    )

    cost_model.fit(
        X_train,
        y_cost_train,
    )

    cost_prediction = (
        cost_model.predict(
            X_test
        )
    )

    cost_r2 = r2_score(
        y_cost_test,
        cost_prediction,
    )

    cost_mae = mean_absolute_error(
        y_cost_test,
        cost_prediction,
    )

    print(
        f"      Cost R²: {cost_r2:.4f}"
    )

    print(
        f"      Cost MAE: {cost_mae:.2f}%"
    )

    # -----------------------------------------------------
    # Risk model
    # -----------------------------------------------------

    print(
        "      Training Risk Score Model..."
    )

    risk_model = RandomForestRegressor(
        n_estimators=180,
        max_depth=9,
        min_samples_split=3,
        min_samples_leaf=1,
        random_state=42,
    )

    risk_model.fit(
        X_train,
        y_risk_train,
    )

    risk_prediction = (
        risk_model.predict(
            X_test
        )
    )

    risk_r2 = r2_score(
        y_risk_test,
        risk_prediction,
    )

    risk_mae = mean_absolute_error(
        y_risk_test,
        risk_prediction,
    )

    print(
        f"      Risk R²: {risk_r2:.4f}"
    )

    print(
        f"      Risk MAE: {risk_mae:.2f} points"
    )

    # -----------------------------------------------------
    # Save models
    # -----------------------------------------------------

    os.makedirs(
        MODELS_DIR,
        exist_ok=True,
    )

    joblib.dump(
        delay_model,
        os.path.join(
            MODELS_DIR,
            "delay_model.joblib",
        ),
    )

    joblib.dump(
        cost_model,
        os.path.join(
            MODELS_DIR,
            "cost_model.joblib",
        ),
    )

    joblib.dump(
        risk_model,
        os.path.join(
            MODELS_DIR,
            "risk_model.joblib",
        ),
    )

    # -----------------------------------------------------
    # Metadata
    # -----------------------------------------------------

    metadata = {
        "version": "3.0.0",

        "project": "NeevAI",

        "paimana_scope":
            "Central Sector Infrastructure Projects (Rs 150 Cr+)",

        "training_dataset":
            "paimana_master_dataset.csv",

        "feature_count":
            len(FEATURE_COLUMNS),

        "feature_columns":
            FEATURE_COLUMNS,

        "supported_sectors":
            sorted(
                set(
                    df["sector"]
                    .astype(str)
                    .str.strip()
                )
            ),

        "training_records":
            int(len(df)),

        "test_records":
            int(len(X_test)),

        "metrics": {
            "delay_model": {
                "r2": float(delay_r2),
                "mae_months": float(delay_mae),
            },

            "cost_model": {
                "r2": float(cost_r2),
                "mae_pct": float(cost_mae),
            },

            "risk_model": {
                "r2": float(risk_r2),
                "mae_points": float(risk_mae),
            },
        },

        "feature_importances": {
            "delay_model": {
                feature: float(value)
                for feature, value in zip(
                    FEATURE_COLUMNS,
                    delay_model.feature_importances_,
                )
            },

            "cost_model": {
                feature: float(value)
                for feature, value in zip(
                    FEATURE_COLUMNS,
                    cost_model.feature_importances_,
                )
            },

            "risk_model": {
                feature: float(value)
                for feature, value in zip(
                    FEATURE_COLUMNS,
                    risk_model.feature_importances_,
                )
            },
        },
    }

    metadata_path = os.path.join(
        MODELS_DIR,
        "model_metadata.json",
    )

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

    # -----------------------------------------------------
    # Complete
    # -----------------------------------------------------

    print()
    print(
        "[7/7] Model artifacts saved."
    )

    print()
    print(
        f"      {MODELS_DIR}"
    )

    print()
    print(
        "      Generated:"
    )

    print(
        "      ✓ delay_model.joblib"
    )

    print(
        "      ✓ cost_model.joblib"
    )

    print(
        "      ✓ risk_model.joblib"
    )

    print(
        "      ✓ model_metadata.json"
    )

    print()
    print("=" * 60)
    print("MODEL TRAINING COMPLETED SUCCESSFULLY")
    print("=" * 60)
    print()

    return metadata


# ---------------------------------------------------------
# Entry point
# ---------------------------------------------------------

if __name__ == "__main__":
    train_and_save_models()