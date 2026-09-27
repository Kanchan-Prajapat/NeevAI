from datetime import datetime
from typing import Any, Dict, Optional


# ---------------------------------------------------------------------------
# Risk configuration
# ---------------------------------------------------------------------------

RISK_WEIGHTS = {
    "cost": 0.30,
    "schedule": 0.30,
    "velocity": 0.20,
    "efficiency": 0.20,
}

LOW_MAX = 25
MEDIUM_MAX = 50
HIGH_MAX = 75


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def clamp(
    value: float,
    minimum: float = 0,
    maximum: float = 100,
) -> float:
    return max(
        minimum,
        min(maximum, value),
    )


def round_value(
    value: float,
    decimals: int = 2,
) -> float:
    return round(value, decimals)


def parse_date(
    value: Any,
) -> Optional[datetime]:

    if value is None:
        return None

    # Firestore Timestamp
    if hasattr(value, "to_datetime"):
        return value.to_datetime()

    # Python datetime
    if isinstance(value, datetime):
        return value

    # ISO string
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(
                value.replace(
                    "Z",
                    "+00:00",
                )
            )
        except ValueError:
            return None

    return None


def days_between(
    start: Optional[datetime],
    end: Optional[datetime],
) -> int:

    if not start or not end:
        return 0

    return max(
        0,
        (end - start).days,
    )


def get_risk_level(
    score: float,
) -> str:

    if score <= LOW_MAX:
        return "Low"

    if score <= MEDIUM_MAX:
        return "Medium"

    if score <= HIGH_MAX:
        return "High"

    return "Critical"


# ---------------------------------------------------------------------------
# Main risk calculation
# ---------------------------------------------------------------------------

def calculate_project_risk(
    project: Dict[str, Any],
    latest_snapshot: Dict[str, Any],
    previous_snapshot: Optional[
        Dict[str, Any]
    ] = None,
) -> Dict[str, Any]:

    # -----------------------------------------------------------------------
    # 1. Project cost
    # -----------------------------------------------------------------------

    project_cost = (
        latest_snapshot.get(
            "revisedCostCr"
        )
        if latest_snapshot.get(
            "revisedCostCr"
        ) is not None
        else project.get(
            "originalCostCr"
        )
        or 0
    )

    expenditure = (
        latest_snapshot.get(
            "cumulativeExpenditureCr"
        )
        or 0
    )

    # -----------------------------------------------------------------------
    # 2. Financial progress
    # -----------------------------------------------------------------------

    if project_cost <= 0:
        financial_progress = 0
    else:
        financial_progress = (
            expenditure / project_cost
        ) * 100

    # -----------------------------------------------------------------------
    # 3. Physical progress
    # -----------------------------------------------------------------------

    physical_progress = clamp(
        latest_snapshot.get(
            "physicalProgressPct"
        )
        or 0
    )

    # -----------------------------------------------------------------------
    # 4. Cost variance
    # -----------------------------------------------------------------------

    cost_variance = (
        financial_progress
        - physical_progress
    )

    # -----------------------------------------------------------------------
    # 5. Project dates
    # -----------------------------------------------------------------------

    project_start = parse_date(
        project.get(
            "approvalDate"
        )
    )

    project_end = parse_date(
        latest_snapshot.get(
            "revisedCompletionDate"
        )
        or latest_snapshot.get(
            "anticipatedCompletionDate"
        )
        or latest_snapshot.get(
            "originalCompletionDate"
        )
        or project.get(
            "originalCompletionDate"
        )
    )

    snapshot_date = parse_date(
        latest_snapshot.get(
            "reportDate"
        )
    )

    # -----------------------------------------------------------------------
    # 6. Planned days
    # -----------------------------------------------------------------------

    planned_days = days_between(
        project_start,
        project_end,
    )

    # -----------------------------------------------------------------------
    # 7. Expected progress
    # -----------------------------------------------------------------------

    expected_progress = 0

    if (
        project_start
        and snapshot_date
        and planned_days > 0
    ):
        elapsed_days = days_between(
            project_start,
            snapshot_date,
        )

        expected_progress = clamp(
            (
                elapsed_days
                / planned_days
            )
            * 100
        )

    # -----------------------------------------------------------------------
    # 8. Schedule variance
    # -----------------------------------------------------------------------

    schedule_variance = (
        physical_progress
        - expected_progress
    )

    # -----------------------------------------------------------------------
    # 9. Expected velocity
    # -----------------------------------------------------------------------

    if planned_days <= 0:
        expected_velocity = 0
    else:
        expected_velocity = (
            100 / planned_days
        )

    # -----------------------------------------------------------------------
    # 10. Actual velocity
    # -----------------------------------------------------------------------

    actual_velocity = 0

    if (
        previous_snapshot
        and snapshot_date
    ):
        previous_date = parse_date(
            previous_snapshot.get(
                "reportDate"
            )
        )

        previous_progress = (
            previous_snapshot.get(
                "physicalProgressPct"
            )
            or 0
        )

        interval_days = days_between(
            previous_date,
            snapshot_date,
        )

        if interval_days > 0:
            actual_velocity = (
                physical_progress
                - previous_progress
            ) / interval_days

    elif (
        project_start
        and snapshot_date
    ):
        elapsed_days = days_between(
            project_start,
            snapshot_date,
        )

        if elapsed_days > 0:
            actual_velocity = (
                physical_progress
                / elapsed_days
            )

    # -----------------------------------------------------------------------
    # 11. Risk components
    # -----------------------------------------------------------------------

    cost_risk = clamp(
        cost_variance * 2
    )

    schedule_risk = clamp(
        -schedule_variance * 2
    )

    velocity_risk = 0

    if expected_velocity > 0:
        velocity_risk = clamp(
            (
                (
                    expected_velocity
                    - actual_velocity
                )
                / expected_velocity
            )
            * 100
        )

    efficiency_risk = clamp(
        cost_variance * 2
    )

    risk_components = {
        "costRisk": round_value(
            cost_risk
        ),
        "scheduleRisk": round_value(
            schedule_risk
        ),
        "velocityRisk": round_value(
            velocity_risk
        ),
        "efficiencyRisk": round_value(
            efficiency_risk
        ),
    }

    # -----------------------------------------------------------------------
    # 12. Overall risk score
    # -----------------------------------------------------------------------

    overall_risk_score = (
        cost_risk
        * RISK_WEIGHTS["cost"]
        + schedule_risk
        * RISK_WEIGHTS["schedule"]
        + velocity_risk
        * RISK_WEIGHTS["velocity"]
        + efficiency_risk
        * RISK_WEIGHTS["efficiency"]
    )

    final_score = round_value(
        clamp(
            overall_risk_score
        )
    )

    # -----------------------------------------------------------------------
    # 13. Final result
    # -----------------------------------------------------------------------

    return {
        "financialProgress": round_value(
            clamp(
                financial_progress
            )
        ),
        "physicalProgress": round_value(
            physical_progress
        ),
        "costVariance": round_value(
            cost_variance
        ),
        "expectedVelocity": round_value(
            expected_velocity,
            4,
        ),
        "actualVelocity": round_value(
            actual_velocity,
            4,
        ),
        "scheduleVariance": round_value(
            schedule_variance
        ),
        "riskComponents": risk_components,
        "overallRiskScore": final_score,
        "riskLevel": get_risk_level(
            final_score
        ),
    }