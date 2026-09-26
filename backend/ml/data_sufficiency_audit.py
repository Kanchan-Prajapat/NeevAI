"""
NeevAI — PAIMANA Data Sufficiency Audit

Purpose:
    Audit the available PAIMANA dataset against the types of
    additional variables discussed in SIH26103 Challenge C.

This script:
    - Inspects the real PAIMANA monthly dataset.
    - Identifies available project-monitoring fields.
    - Checks candidate additional variables.
    - Distinguishes available fields from missing variables.
    - Reports whether Challenge C can currently be evaluated.

This script DOES NOT:
    - create synthetic variables
    - invent missing values
    - train a model
    - modify the source dataset
    - claim that missing variables improve prediction
"""

import os

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
# Candidate additional variables from the SIH26103 study
# ---------------------------------------------------------

CANDIDATE_ADDITIONAL_VARIABLES = {
    "Land Acquisition": [
        "land_acquisition_status",
        "land_acquisition_delay_months",
        "land_acquisition_indicator",
    ],

    "Clearance / Approval": [
        "clearance_status",
        "clearance_delay_months",
        "environmental_clearance_status",
        "approval_delay_months",
    ],

    "Contractor Performance": [
        "contractor_performance_history",
        "contractor_delay_score",
        "contractor_dispute_history",
    ],

    "Weather Disruption": [
        "weather_disruption",
        "weather_disruption_days",
        "weather_delay_months",
    ],

    "Litigation / Legal": [
        "litigation_status",
        "litigation_cases",
        "legal_dispute_indicator",
    ],
}


# ---------------------------------------------------------
# PAIMANA fields already present in the current dataset
# ---------------------------------------------------------

KNOWN_PAIMANA_FIELDS = [
    "report_month",
    "sl_no",
    "project_code",
    "project_name",
    "agency",
    "state",
    "ministry",
    "sector",
    "approval_date",
    "start_date",
    "original_completion_date",
    "revised_completion_date",
    "original_cost_cr",
    "revised_cost_cr",
    "cumulative_expenditure_cr",
    "physical_progress_pct",
    "source_file",
    "source_page",
]


# ---------------------------------------------------------
# Helpers
# ---------------------------------------------------------

def print_section(title: str) -> None:

    print()
    print("=" * 70)
    print(title)
    print("=" * 70)


def normalize_column_name(
    column: str,
) -> str:

    return (
        str(column)
        .strip()
        .lower()
        .replace(" ", "_")
        .replace("-", "_")
    )


# ---------------------------------------------------------
# Main audit
# ---------------------------------------------------------

def audit_data_sufficiency():

    print()
    print("=" * 70)
    print("NeevAI PAIMANA DATA SUFFICIENCY AUDIT")
    print("SIH26103 — Challenge C")
    print("=" * 70)

    # -----------------------------------------------------
    # 1. Load dataset
    # -----------------------------------------------------

    print_section(
        "[1/6] Loading real PAIMANA dataset"
    )

    if not os.path.exists(DATASET_PATH):

        raise FileNotFoundError(
            "PAIMANA dataset not found:\n"
            f"{DATASET_PATH}"
        )

    df = pd.read_csv(
        DATASET_PATH
    )

    print(
        f"Records : {len(df):,}"
    )

    print(
        f"Columns : {len(df.columns)}"
    )

    # -----------------------------------------------------
    # 2. Normalize column names for comparison
    # -----------------------------------------------------

    normalized_columns = {
        normalize_column_name(column): column
        for column in df.columns
    }

    print_section(
        "[2/6] Available PAIMANA monitoring fields"
    )

    available_known_fields = []

    for field in KNOWN_PAIMANA_FIELDS:

        normalized_field = (
            normalize_column_name(field)
        )

        if normalized_field in normalized_columns:

            actual_name = normalized_columns[
                normalized_field
            ]

            available_known_fields.append(
                actual_name
            )

            print(
                f"  ✓ {actual_name}"
            )

        else:

            print(
                f"  - {field}"
                " (not present)"
            )

    print()
    print(
        f"Available known fields: "
        f"{len(available_known_fields)}"
    )

    # -----------------------------------------------------
    # 3. Inspect all actual columns
    # -----------------------------------------------------

    print_section(
        "[3/6] Complete dataset column inventory"
    )

    for index, column in enumerate(
        df.columns,
        start=1,
    ):

        print(
            f"  {index:02d}. {column}"
        )

    # -----------------------------------------------------
    # 4. Check additional variables
    # -----------------------------------------------------

    print_section(
        "[4/6] Candidate additional-variable audit"
    )

    available_additional = {}
    missing_additional = {}

    for category, candidates in (
        CANDIDATE_ADDITIONAL_VARIABLES.items()
    ):

        print()
        print(
            f"{category}:"
        )

        category_available = []
        category_missing = []

        for candidate in candidates:

            normalized_candidate = (
                normalize_column_name(
                    candidate
                )
            )

            if (
                normalized_candidate
                in normalized_columns
            ):

                actual_name = normalized_columns[
                    normalized_candidate
                ]

                category_available.append(
                    actual_name
                )

                print(
                    f"  ✓ AVAILABLE: "
                    f"{actual_name}"
                )

            else:

                category_missing.append(
                    candidate
                )

                print(
                    f"  ✗ NOT AVAILABLE: "
                    f"{candidate}"
                )

        available_additional[
            category
        ] = category_available

        missing_additional[
            category
        ] = category_missing

    # -----------------------------------------------------
    # 5. Determine Challenge C feasibility
    # -----------------------------------------------------

    print_section(
        "[5/6] Challenge C feasibility"
    )

    total_available = sum(
        len(values)
        for values
        in available_additional.values()
    )

    total_missing = sum(
        len(values)
        for values
        in missing_additional.values()
    )

    print(
        f"Candidate variables checked : "
        f"{total_available + total_missing}"
    )

    print(
        f"Candidate variables available: "
        f"{total_available}"
    )

    print(
        f"Candidate variables missing   : "
        f"{total_missing}"
    )

    print()

    if total_available > 0:

        print(
            "⚠ Some candidate additional "
            "variables are present."
        )

        print(
            "   Their predictive contribution "
            "must be evaluated experimentally."
        )

    else:

        print(
            "✗ No candidate additional variables "
            "are currently present."
        )

        print(
            "   Challenge C cannot yet be evaluated "
            "experimentally using these variables."
        )

    print()

    print(
        "Important:"
    )

    print(
        "Missing variables must NOT be populated "
        "with fabricated or synthetic values."
    )

    print(
        "A genuine CUF-vs-extended comparison "
        "requires real observations for the "
        "additional variables."
    )

    # -----------------------------------------------------
    # 6. Final report
    # -----------------------------------------------------

    print_section(
        "[6/6] Final data-sufficiency summary"
    )

    print()
    print(
        "Existing PAIMANA monitoring data:"
    )

    print(
        "  ✓ Available"
    )

    print()
    print(
        "Additional-variable evidence:"
    )

    if total_available:

        print(
            "  ⚠ Partially available"
        )

    else:

        print(
            "  ✗ Not available in current dataset"
        )

    print()
    print(
        "Challenge C:"
    )

    if (
        total_available > 0
        and total_missing > 0
    ):

        print(
            "  ⚠ Partial evaluation may be possible."
        )

    elif total_available > 0:

        print(
            "  ✓ Candidate variables available "
            "for evaluation."
        )

    else:

        print(
            "  ✗ Requires additional real data "
            "before experimental evaluation."
        )

    print()
    print("=" * 70)
    print("DATA SUFFICIENCY AUDIT COMPLETED")
    print("=" * 70)
    print()


# ---------------------------------------------------------
# Entry point
# ---------------------------------------------------------

if __name__ == "__main__":

    audit_data_sufficiency()