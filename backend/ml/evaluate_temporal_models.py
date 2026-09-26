"""
NeevAI Temporal Model Evaluation

Purpose:
    Compare a conventional statistical baseline against the
    current NeevAI temporal ML model.

Comparison:
    1. Linear Regression
    2. Gradient Boosting Regressor

Task:
    Predict next-month physical progress.

Evaluation design:
    Training data  -> May 2026
    Testing data   -> June 2026

Target:
    next_month_physical_progress_pct

Important:
    - Uses only real PAIMANA-derived data.
    - Uses the existing temporal feature dataset.
    - Uses the same 10 safe features as the temporal model.
    - Uses a time-aware train/test split.
    - Does not create synthetic targets.
    - Does not overwrite the existing temporal model.
"""

import json
import os

import numpy as np
import pandas as pd

from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
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

DATASET_PATH = os.path.join(
    PROJECT_ROOT,
    "data",
    "processed",
    "paimana_temporal_feature_dataset_may_july_2026.csv",
)

EVALUATION_DIR = os.path.join(
    CURRENT_DIR,
    "models",
    "evaluation",
)


# ---------------------------------------------------------
# Evaluation configuration
# ---------------------------------------------------------

TRAIN_MONTH = "2026-05"
TEST_MONTH = "2026-06"

TARGET_COLUMN = (
    "next_month_physical_progress_pct"
)


# ---------------------------------------------------------
# Same safe features used by the existing
# temporal progress model
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

def validate_dataset(
    df: pd.DataFrame,
) -> None:

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
            "Temporal evaluation dataset is missing "
            "required columns: "
            + ", ".join(missing_columns)
        )

    if df.empty:

        raise ValueError(
            "Temporal evaluation dataset is empty."
        )


# ---------------------------------------------------------
# Prepare dataset
# ---------------------------------------------------------

def prepare_dataset(
    df: pd.DataFrame,
) -> pd.DataFrame:

    df = df.copy()

    # Normalize report month
    df["report_month"] = (
        pd.to_datetime(
            df["report_month"],
            errors="coerce",
        )
        .dt.strftime("%Y-%m")
    )

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
# Calculate regression metrics
# ---------------------------------------------------------

def calculate_metrics(
    y_true,
    predictions,
) -> dict:

    mae = mean_absolute_error(
        y_true,
        predictions,
    )

    rmse = np.sqrt(
        mean_squared_error(
            y_true,
            predictions,
        )
    )

    r2 = r2_score(
        y_true,
        predictions,
    )

    return {
        "mae": float(mae),
        "rmse": float(rmse),
        "r2": float(r2),
    }


# ---------------------------------------------------------
# Evaluate model
# ---------------------------------------------------------

def evaluate_model(
    model,
    X_train,
    y_train,
    X_test,
    y_test,
):

    model.fit(
        X_train,
        y_train,
    )

    predictions = model.predict(
        X_test
    )

    metrics = calculate_metrics(
        y_test,
        predictions,
    )

    return metrics


# ---------------------------------------------------------
# Main evaluation
# ---------------------------------------------------------

def evaluate_temporal_models():

    print()
    print("=" * 70)
    print("NeevAI TEMPORAL MODEL EVALUATION")
    print("Conventional Statistical vs Machine Learning")
    print("=" * 70)
    print()

    # -----------------------------------------------------
    # 1. Load dataset
    # -----------------------------------------------------

    print(
        "[1/7] Loading temporal PAIMANA dataset..."
    )

    if not os.path.exists(DATASET_PATH):

        raise FileNotFoundError(
            "Temporal PAIMANA dataset not found:\n"
            f"{DATASET_PATH}"
        )

    df = pd.read_csv(
        DATASET_PATH
    )

    print(
        f"      Loaded {len(df):,} project-month records."
    )

    # -----------------------------------------------------
    # 2. Validate dataset
    # -----------------------------------------------------

    print()
    print(
        "[2/7] Validating dataset..."
    )

    validate_dataset(
        df
    )

    df = prepare_dataset(
        df
    )

    print(
        "      Dataset validation successful."
    )

    # -----------------------------------------------------
    # 3. Time-aware split
    # -----------------------------------------------------

    print()
    print(
        "[3/7] Creating time-aware train/test split..."
    )

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
    # 4. Remove incomplete records
    # -----------------------------------------------------

    print()
    print(
        "[4/7] Preparing model features..."
    )

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
    # 5. Define models
    # -----------------------------------------------------

    print()
    print(
        "[5/7] Preparing evaluation models..."
    )

    # Conventional statistical baseline
    baseline_model = LinearRegression()

    # Current NeevAI temporal ML configuration
    ml_model = GradientBoostingRegressor(
        n_estimators=220,
        learning_rate=0.05,
        max_depth=4,
        min_samples_split=5,
        min_samples_leaf=3,
        subsample=0.9,
        random_state=42,
    )

    print(
        "      ✓ Linear Regression"
    )

    print(
        "      ✓ Gradient Boosting Regressor"
    )

    # -----------------------------------------------------
    # 6. Run evaluation
    # -----------------------------------------------------

    print()
    print(
        "[6/7] Running model comparison..."
    )

    baseline_metrics = evaluate_model(
        model=baseline_model,
        X_train=X_train,
        y_train=y_train,
        X_test=X_test,
        y_test=y_test,
    )

    ml_metrics = evaluate_model(
        model=ml_model,
        X_train=X_train,
        y_train=y_train,
        X_test=X_test,
        y_test=y_test,
    )

    # -----------------------------------------------------
    # Print results
    # -----------------------------------------------------

    print()
    print("-" * 60)
    print("MODEL COMPARISON")
    print("-" * 60)

    print()
    print(
        "Conventional Statistical Model"
    )

    print(
        f"  Model: Linear Regression"
    )

    print(
        f"  MAE :  {baseline_metrics['mae']:.4f}"
    )

    print(
        f"  RMSE:  {baseline_metrics['rmse']:.4f}"
    )

    print(
        f"  R²  :  {baseline_metrics['r2']:.4f}"
    )

    print()
    print(
        "Current NeevAI ML Model"
    )

    print(
        f"  Model: Gradient Boosting Regressor"
    )

    print(
        f"  MAE :  {ml_metrics['mae']:.4f}"
    )

    print(
        f"  RMSE:  {ml_metrics['rmse']:.4f}"
    )

    print(
        f"  R²  :  {ml_metrics['r2']:.4f}"
    )

    # -----------------------------------------------------
    # Metric differences
    # -----------------------------------------------------

    mae_change = (
        baseline_metrics["mae"]
        - ml_metrics["mae"]
    )

    rmse_change = (
        baseline_metrics["rmse"]
        - ml_metrics["rmse"]
    )

    r2_change = (
        ml_metrics["r2"]
        - baseline_metrics["r2"]
    )

    print()
    print(
        "Metric Difference"
    )

    print(
        f"  MAE improvement:  {mae_change:.4f}"
    )

    print(
        f"  RMSE improvement: {rmse_change:.4f}"
    )

    print(
        f"  R² difference:    {r2_change:.4f}"
    )

    # -----------------------------------------------------
    # Save evaluation report
    # -----------------------------------------------------

    print()
    print(
        "[7/7] Saving evaluation report..."
    )

    os.makedirs(
        EVALUATION_DIR,
        exist_ok=True,
    )

    report_path = os.path.join(
        EVALUATION_DIR,
        "temporal_model_evaluation.json",
    )

    results = {

        "project": "NeevAI",

        "evaluation_type": (
            "Temporal conventional statistical "
            "vs machine learning comparison"
        ),

        "task": (
            "Next-month physical progress prediction"
        ),

        "dataset": (
            "paimana_temporal_feature_dataset_may_july_2026.csv"
        ),

        "training_month": TRAIN_MONTH,

        "testing_month": TEST_MONTH,

        "target": TARGET_COLUMN,

        "feature_count": len(
            SAFE_FEATURES
        ),

        "feature_columns": SAFE_FEATURES,

        "training_records": int(
            len(X_train)
        ),

        "testing_records": int(
            len(X_test)
        ),

        "models": {

            "conventional_statistical": {

                "model": "Linear Regression",

                "metrics": baseline_metrics,
            },

            "machine_learning": {

                "model": (
                    "GradientBoostingRegressor"
                ),

                "configuration": {

                    "n_estimators": 220,

                    "learning_rate": 0.05,

                    "max_depth": 4,

                    "min_samples_split": 5,

                    "min_samples_leaf": 3,

                    "subsample": 0.9,

                    "random_state": 42,
                },

                "metrics": ml_metrics,
            },
        },

        "metric_difference": {

            "mae_improvement": float(
                mae_change
            ),

            "rmse_improvement": float(
                rmse_change
            ),

            "r2_difference": float(
                r2_change
            ),
        },

        "methodology_notes": [

            "Evaluation uses real PAIMANA-derived data.",

            "Training uses May 2026 project snapshots.",

            "Testing uses June 2026 project snapshots.",

            "The target represents next-month physical progress.",

            "No synthetic target values were created.",

            "No random train/test split was used.",

            "The existing temporal model artifact was not overwritten.",

        ],
    }

    with open(
        report_path,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            results,
            file,
            indent=2,
        )

    print(
        f"      Evaluation report saved:"
    )

    print(
        f"      {report_path}"
    )

    print()
    print("=" * 70)
    print("TEMPORAL MODEL EVALUATION COMPLETED")
    print("=" * 70)
    print()


# ---------------------------------------------------------
# Entry point
# ---------------------------------------------------------

if __name__ == "__main__":

    evaluate_temporal_models()