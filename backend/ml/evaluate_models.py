"""
NeevAI Model Evaluation Pipeline

Compares:
1. Conventional Statistical Baseline
   - Linear Regression

2. Current NeevAI ML Models
   - Gradient Boosting for Delay
   - Gradient Boosting for Cost Overrun
   - Random Forest for Risk Score

Evaluation uses:
- The same real PAIMANA dataset
- The same 24-feature engineering pipeline
- The same train/test split as train_models.py

IMPORTANT:
- This file does NOT overwrite trained model artifacts.
- No synthetic/default data is generated.
- Metrics are calculated from the actual dataset.
"""

import os
import json

import numpy as np
import pandas as pd

from sklearn.ensemble import (
    GradientBoostingRegressor,
    RandomForestRegressor,
)

from sklearn.linear_model import LinearRegression

from sklearn.model_selection import train_test_split

from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
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

EVALUATION_DIR = os.path.join(
    CURRENT_DIR,
    "models",
    "evaluation",
)

DATASET_PATH = os.path.join(
    DATA_DIR,
    "paimana_master_dataset.csv",
)


# ---------------------------------------------------------
# Required columns
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

def validate_dataset(
    df: pd.DataFrame,
) -> None:

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
            f"Found {len(df)} records."
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
# Validate numeric data
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
# Calculate metrics
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
# Evaluate one target
# ---------------------------------------------------------

def evaluate_target(
    target_name,
    y_train,
    y_test,
    X_train,
    X_test,
    ml_model,
):
    """
    Train and compare:

    Conventional:
        Linear Regression

    ML:
        Current NeevAI model
    """

    print()
    print("-" * 60)
    print(f"Evaluating: {target_name}")
    print("-" * 60)

    # -----------------------------------------------------
    # Conventional statistical baseline
    # -----------------------------------------------------

    print(
        "Training conventional baseline: Linear Regression..."
    )

    baseline_model = LinearRegression()

    baseline_model.fit(
        X_train,
        y_train,
    )

    baseline_predictions = (
        baseline_model.predict(
            X_test
        )
    )

    baseline_metrics = calculate_metrics(
        y_test,
        baseline_predictions,
    )

    # -----------------------------------------------------
    # Current ML model
    # -----------------------------------------------------

    print(
        "Training current NeevAI ML model..."
    )

    ml_model.fit(
        X_train,
        y_train,
    )

    ml_predictions = (
        ml_model.predict(
            X_test
        )
    )

    ml_metrics = calculate_metrics(
        y_test,
        ml_predictions,
    )

    # -----------------------------------------------------
    # Print results
    # -----------------------------------------------------

    print()
    print(
        "Conventional Statistical Model"
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
        f"  MAE :  {ml_metrics['mae']:.4f}"
    )

    print(
        f"  RMSE:  {ml_metrics['rmse']:.4f}"
    )

    print(
        f"  R²  :  {ml_metrics['r2']:.4f}"
    )

    return {
        "target": target_name,

        "conventional_statistical": {
            "model": "Linear Regression",
            "metrics": baseline_metrics,
        },

        "machine_learning": {
            "model": type(ml_model).__name__,
            "metrics": ml_metrics,
        },
    }


# ---------------------------------------------------------
# Main evaluation
# ---------------------------------------------------------

def evaluate_models():

    print()
    print("=" * 70)
    print("NeevAI MODEL EVALUATION")
    print("Conventional Statistical vs Machine Learning")
    print("=" * 70)
    print()

    # -----------------------------------------------------
    # 1. Check dataset
    # -----------------------------------------------------

    print(
        "[1/6] Loading PAIMANA dataset..."
    )

    if not os.path.exists(DATASET_PATH):

        raise FileNotFoundError(
            "PAIMANA training dataset not found:\n"
            f"{DATASET_PATH}"
        )

    df = pd.read_csv(
        DATASET_PATH
    )

    print(
        f"      Loaded {len(df):,} project records."
    )

    # -----------------------------------------------------
    # 2. Validate
    # -----------------------------------------------------

    print()
    print(
        "[2/6] Validating dataset..."
    )

    validate_dataset(
        df
    )

    df = prepare_numeric_columns(
        df
    )

    print(
        "      Dataset validation successful."
    )

    # -----------------------------------------------------
    # 3. Feature engineering
    # -----------------------------------------------------

    print()
    print(
        "[3/6] Engineering 24 ML features..."
    )

    X = get_feature_matrix(
        df
    )

    if X.shape[1] != len(
        FEATURE_COLUMNS
    ):

        raise ValueError(
            "Feature count mismatch. "
            f"Expected {len(FEATURE_COLUMNS)}, "
            f"got {X.shape[1]}."
        )

    print(
        f"      Feature matrix: {X.shape}"
    )

    # -----------------------------------------------------
    # Targets
    # -----------------------------------------------------

    y_delay = (
        df[
            "target_time_delay_months"
        ].values
    )

    y_cost = (
        df[
            "target_cost_overrun_pct"
        ].values
    )

    y_risk = (
        df[
            "target_risk_score"
        ].values
    )

    # -----------------------------------------------------
    # 4. Same train/test split as existing pipeline
    # -----------------------------------------------------

    print()
    print(
        "[4/6] Creating identical train/test split..."
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
        f"      Training records: {len(X_train):,}"
    )

    print(
        f"      Testing records:  {len(X_test):,}"
    )

    # -----------------------------------------------------
    # 5. Define current ML models
    # -----------------------------------------------------

    print()
    print(
        "[5/6] Preparing evaluation models..."
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

    cost_model = GradientBoostingRegressor(
        n_estimators=200,
        learning_rate=0.06,
        max_depth=5,
        min_samples_split=4,
        min_samples_leaf=2,
        subsample=0.9,
        random_state=42,
    )

    risk_model = RandomForestRegressor(
        n_estimators=180,
        max_depth=9,
        min_samples_split=3,
        min_samples_leaf=1,
        random_state=42,
    )

    # -----------------------------------------------------
    # 6. Evaluate all three targets
    # -----------------------------------------------------

    print()
    print(
        "[6/6] Running model comparison..."
    )

    results = {
        "project": "NeevAI",

        "evaluation_type": (
            "Conventional Statistical "
            "vs Machine Learning"
        ),

        "dataset": (
            "paimana_master_dataset.csv"
        ),

        "feature_count": len(
            FEATURE_COLUMNS
        ),

        "feature_columns": FEATURE_COLUMNS,

        "train_test_split": {
            "test_size": 0.18,
            "random_state": 42,
            "training_records": int(
                len(X_train)
            ),
            "testing_records": int(
                len(X_test)
            ),
        },

        "targets": [],
    }

    # -----------------------------------------------------
    # Delay
    # -----------------------------------------------------

    delay_result = evaluate_target(
        target_name="Time Delay (months)",

        y_train=y_delay_train,
        y_test=y_delay_test,

        X_train=X_train,
        X_test=X_test,

        ml_model=delay_model,
    )

    results["targets"].append(
        delay_result
    )

    # -----------------------------------------------------
    # Cost
    # -----------------------------------------------------

    cost_result = evaluate_target(
        target_name="Cost Overrun (%)",

        y_train=y_cost_train,
        y_test=y_cost_test,

        X_train=X_train,
        X_test=X_test,

        ml_model=cost_model,
    )

    results["targets"].append(
        cost_result
    )

    # -----------------------------------------------------
    # Risk
    # -----------------------------------------------------

    risk_result = evaluate_target(
        target_name="Risk Score",

        y_train=y_risk_train,
        y_test=y_risk_test,

        X_train=X_train,
        X_test=X_test,

        ml_model=risk_model,
    )

    results["targets"].append(
        risk_result
    )

    # -----------------------------------------------------
    # Save evaluation report
    # -----------------------------------------------------

    os.makedirs(
        EVALUATION_DIR,
        exist_ok=True,
    )

    report_path = os.path.join(
        EVALUATION_DIR,
        "model_evaluation.json",
    )

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

    # -----------------------------------------------------
    # Final summary
    # -----------------------------------------------------

    print()
    print("=" * 70)
    print("MODEL EVALUATION COMPLETED")
    print("=" * 70)

    print()
    print(
        "Evaluation report:"
    )

    print(
        f"  {report_path}"
    )

    print()
    print(
        "Targets evaluated:"
    )

    print(
        "  ✓ Time Delay"
    )

    print(
        "  ✓ Cost Overrun"
    )

    print(
        "  ✓ Risk Score"
    )

    print()
    print(
        "Comparison:"
    )

    print(
        "  ✓ Linear Regression"
    )

    print(
        "  ✓ Gradient Boosting"
    )

    print(
        "  ✓ Random Forest"
    )

    print()

    return results


# ---------------------------------------------------------
# Entry point
# ---------------------------------------------------------

if __name__ == "__main__":

    evaluate_models()