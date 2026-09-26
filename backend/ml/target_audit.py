"""
NeevAI PAIMANA Target Audit

Purpose:
    Verify which prediction targets can be legitimately obtained
    from the available real PAIMANA monthly dataset.

This script does NOT:
    - create synthetic data
    - train models
    - overwrite datasets
    - create artificial risk labels

It only audits available fields and derives transparent,
source-based indicators for target feasibility.
"""

import os

import numpy as np
import pandas as pd


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
    "paimana_project_monthly.csv",
)


# ---------------------------------------------------------
# Helpers
# ---------------------------------------------------------

def print_section(title: str) -> None:
    print()
    print("=" * 70)
    print(title)
    print("=" * 70)


def calculate_month_difference(
    start_dates,
    end_dates,
):
    """
    Calculates approximate month difference between two dates.
    """
    start = pd.to_datetime(
        start_dates,
        errors="coerce",
    )

    end = pd.to_datetime(
        end_dates,
        errors="coerce",
    )

    return (
        (end.dt.year - start.dt.year) * 12
        + (end.dt.month - start.dt.month)
    )


# ---------------------------------------------------------
# Main audit
# ---------------------------------------------------------

def audit_targets():

    print()
    print("=" * 70)
    print("NeevAI PAIMANA TARGET AUDIT")
    print("=" * 70)

    # -----------------------------------------------------
    # 1. Load dataset
    # -----------------------------------------------------

    print()
    print("[1/6] Loading real PAIMANA monthly dataset...")

    if not os.path.exists(DATASET_PATH):

        raise FileNotFoundError(
            "PAIMANA monthly dataset not found:\n"
            f"{DATASET_PATH}"
        )

    df = pd.read_csv(
        DATASET_PATH
    )

    print(
        f"      Records: {len(df):,}"
    )

    print(
        f"      Columns: {len(df.columns)}"
    )

    # -----------------------------------------------------
    # 2. Required source fields
    # -----------------------------------------------------

    print()
    print("[2/6] Checking source fields...")

    required_fields = [
        "project_code",
        "report_month",
        "original_cost_cr",
        "revised_cost_cr",
        "original_completion_date",
        "revised_completion_date",
        "physical_progress_pct",
    ]

    for column in required_fields:

        if column in df.columns:

            print(
                f"      ✓ {column}"
            )

        else:

            print(
                f"      ✗ {column}"
            )

    # -----------------------------------------------------
    # 3. Cost overrun feasibility
    # -----------------------------------------------------

    print()
    print("[3/6] Auditing cost-overrun target...")

    cost_columns_available = (
        "original_cost_cr" in df.columns
        and "revised_cost_cr" in df.columns
    )

    if cost_columns_available:

        original_cost = pd.to_numeric(
            df["original_cost_cr"],
            errors="coerce",
        )

        revised_cost = pd.to_numeric(
            df["revised_cost_cr"],
            errors="coerce",
        )

        valid_cost_rows = (
            original_cost.gt(0)
            & revised_cost.notna()
        )

        cost_overrun_pct = (
            (
                revised_cost
                - original_cost
            )
            / original_cost
        ) * 100

        cost_overrun_pct = cost_overrun_pct.where(
            valid_cost_rows
        )

        print(
            f"      Valid rows: "
            f"{valid_cost_rows.sum():,}"
        )

        print(
            "      ✓ Cost overrun percentage "
            "is directly derivable from PAIMANA cost fields."
        )

        print(
            "      Formula:"
        )

        print(
            "      ((revised_cost_cr - original_cost_cr)"
            " / original_cost_cr) × 100"
        )

        print(
            f"      Mean derived value: "
            f"{cost_overrun_pct.mean():.2f}%"
        )

        print(
            f"      Maximum derived value: "
            f"{cost_overrun_pct.max():.2f}%"
        )

    else:

        print(
            "      ✗ Required cost fields unavailable."
        )

    # -----------------------------------------------------
    # 4. Time-overrun feasibility
    # -----------------------------------------------------

    print()
    print("[4/6] Auditing time-overrun target...")

    completion_columns_available = (
        "original_completion_date" in df.columns
        and "revised_completion_date" in df.columns
    )

    if completion_columns_available:

        original_completion = pd.to_datetime(
            df["original_completion_date"],
            errors="coerce",
        )

        revised_completion = pd.to_datetime(
            df["revised_completion_date"],
            errors="coerce",
        )

        valid_completion_rows = (
            original_completion.notna()
            & revised_completion.notna()
        )

        schedule_extension_months = (
            calculate_month_difference(
                original_completion,
                revised_completion,
            )
        )

        schedule_extension_months = (
            schedule_extension_months.where(
                valid_completion_rows
            )
        )

        print(
            f"      Valid rows: "
            f"{valid_completion_rows.sum():,}"
        )

        print(
            "      ✓ Schedule extension is "
            "derivable from PAIMANA completion dates."
        )

        print(
            "      Formula:"
        )

        print(
            "      revised_completion_date "
            "- original_completion_date"
        )

        print(
            f"      Mean derived extension: "
            f"{schedule_extension_months.mean():.2f} months"
        )

        print(
            f"      Maximum derived extension: "
            f"{schedule_extension_months.max():.2f} months"
        )

    else:

        print(
            "      ✗ Required completion-date fields unavailable."
        )

    # -----------------------------------------------------
    # 5. Risk-score feasibility
    # -----------------------------------------------------

    print()
    print("[5/6] Auditing risk-score target...")

    risk_target_candidates = [
        "target_risk_score",
        "risk_score",
        "project_risk_score",
        "risk",
    ]

    found_risk_columns = [
        column
        for column in risk_target_candidates
        if column in df.columns
    ]

    if found_risk_columns:

        print(
            "      Found possible risk fields:"
        )

        for column in found_risk_columns:

            print(
                f"      ✓ {column}"
            )

        print()
        print(
            "      Risk target requires further validation "
            "before ML evaluation."
        )

    else:

        print(
            "      ✗ No authoritative risk-score target "
            "field found."
        )

        print()
        print(
            "      IMPORTANT:"
        )

        print(
            "      A risk score must NOT be fabricated "
            "from the same input features used by the model."
        )

        print(
            "      Otherwise the evaluation would become "
            "circular."
        )

    # -----------------------------------------------------
    # 6. Final feasibility summary
    # -----------------------------------------------------

    print()
    print("[6/6] Target feasibility summary...")

    print()

    print(
        "      Cost Overrun:"
    )

    if cost_columns_available:

        print(
            "      ✓ DERIVABLE"
        )

    else:

        print(
            "      ✗ NOT AVAILABLE"
        )

    print()

    print(
        "      Time / Schedule Overrun:"
    )

    if completion_columns_available:

        print(
            "      ✓ DERIVABLE"
        )

    else:

        print(
            "      ✗ NOT AVAILABLE"
        )

    print()

    print(
        "      Risk Score:"
    )

    if found_risk_columns:

        print(
            "      ⚠ FOUND — REQUIRES VALIDATION"
        )

    else:

        print(
            "      ✗ NO AUTHORITATIVE TARGET"
        )

    print()
    print("=" * 70)
    print("TARGET AUDIT COMPLETED")
    print("=" * 70)
    print()


# ---------------------------------------------------------
# Entry point
# ---------------------------------------------------------

if __name__ == "__main__":

    audit_targets()