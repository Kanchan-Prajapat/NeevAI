"""
NeevAI Project Intelligence Advisor

Purpose:
    Convert verified project data, ML predictions, and temporal
    progress forecasts into grounded project-level explanations
    and decision-support recommendations.

Important:
    - Does not invent missing project data.
    - Does not use unavailable land/clearance/contractor fields.
    - Does not create new ML predictions.
    - Uses prediction_engine.py output keys exactly.
    - Recommendations are based only on available evidence.
"""


from typing import Any, Dict, List


class AIProjectAdvisor:

    # ------------------------------------------------------------------
    # Numeric helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _number(
        value: Any,
        default: float = 0.0,
    ) -> float:

        if value is None:
            return default

        try:
            return float(value)
        except (
            TypeError,
            ValueError,
        ):
            return default

    # ------------------------------------------------------------------
    # Project information helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _project_name(
        project_data: Dict[str, Any],
    ) -> str:

        return (
            project_data.get("project_name")
            or project_data.get("projectName")
            or "Selected Infrastructure Project"
        )

    @staticmethod
    def _sector(
        project_data: Dict[str, Any],
    ) -> str:

        return (
            project_data.get("sector")
            or project_data.get("domain")
            or "Infrastructure"
        )

    @staticmethod
    def _agency(
        project_data: Dict[str, Any],
    ) -> str:

        return (
            project_data.get("implementingAgency")
            or project_data.get("implementing_agency")
            or project_data.get("agency")
            or "Agency not available"
        )

    @staticmethod
    def _state(
        project_data: Dict[str, Any],
    ) -> str:

        return (
            project_data.get("state_location")
            or project_data.get("state")
            or "State not available"
        )

    # ------------------------------------------------------------------
    # Prediction normalization
    # ------------------------------------------------------------------

    @staticmethod
    def _prediction_values(
        predictions: Dict[str, Any],
    ) -> Dict[str, float]:

        """
        Uses the exact output keys from prediction_engine.py.
        """

        risk_score = AIProjectAdvisor._number(
            predictions.get(
                "predicted_risk_score"
            )
        )

        delay_months = AIProjectAdvisor._number(
            predictions.get(
                "predicted_delay_months"
            )
        )

        cost_overrun_pct = AIProjectAdvisor._number(
            predictions.get(
                "predicted_cost_overrun_pct"
            )
        )

        cost_overrun_cr = AIProjectAdvisor._number(
            predictions.get(
                "predicted_cost_overrun_cr"
            )
        )

        risk_category = (
            predictions.get(
                "risk_category"
            )
            or "UNKNOWN"
        )

        return {
            "risk_score": risk_score,
            "delay_months": delay_months,
            "cost_overrun_pct": cost_overrun_pct,
            "cost_overrun_cr": cost_overrun_cr,
            "risk_category": risk_category,
        }

    # ------------------------------------------------------------------
    # Evidence extraction
    # ------------------------------------------------------------------

    @staticmethod
    def _execution_evidence(
        project_data: Dict[str, Any],
        predictions: Dict[str, Any],
    ) -> List[Dict[str, Any]]:

        """
        Identify evidence-backed execution signals.

        Only fields actually available in the supplied project context
        are considered.
        """

        evidence = []

        physical_progress = AIProjectAdvisor._number(
            project_data.get(
                "physical_progress_pct",
                project_data.get(
                    "physicalProgressPct"
                ),
            )
        )

        financial_progress = AIProjectAdvisor._number(
            project_data.get(
                "financial_progress_pct",
                project_data.get(
                    "financialProgressPct"
                ),
            )
        )

        if (
            "financial_progress_pct" not in project_data
            and "financialProgressPct" not in project_data
        ):

            cumulative_expenditure = AIProjectAdvisor._number(
                project_data.get(
                    "cumulative_expenditure_cr",
                    project_data.get(
                        "cumulativeExpenditureCr"
                    ),
                )
            )

            revised_cost = AIProjectAdvisor._number(
                project_data.get(
                    "revised_cost_cr",
                    project_data.get(
                        "revisedCostCr"
                    ),
                )
            )

            if revised_cost > 0:

                financial_progress = (
                    cumulative_expenditure
                    / revised_cost
                ) * 100.0

        progress_gap = (
            financial_progress
            - physical_progress
        )

        # --------------------------------------------------------------
        # Financial vs physical progress
        # --------------------------------------------------------------

        if progress_gap > 10:

            evidence.append(
                {
                    "category": "Financial-Physical Progress Gap",
                    "severity": "High",
                    "finding": (
                        f"Financial progress is approximately "
                        f"{progress_gap:.1f} percentage points "
                        f"ahead of physical progress."
                    ),
                }
            )

        elif progress_gap > 5:

            evidence.append(
                {
                    "category": "Financial-Physical Progress Gap",
                    "severity": "Medium",
                    "finding": (
                        f"Financial progress is approximately "
                        f"{progress_gap:.1f} percentage points "
                        f"ahead of physical progress."
                    ),
                }
            )

        elif progress_gap < -10:

            evidence.append(
                {
                    "category": "Physical-Financial Progress Gap",
                    "severity": "Medium",
                    "finding": (
                        f"Physical progress is approximately "
                        f"{abs(progress_gap):.1f} percentage points "
                        f"ahead of financial utilization."
                    ),
                }
            )

        # --------------------------------------------------------------
        # Cost prediction
        # --------------------------------------------------------------

        prediction_values = (
            AIProjectAdvisor._prediction_values(
                predictions
            )
        )

        if (
            prediction_values["cost_overrun_pct"]
            > 5
        ):

            evidence.append(
                {
                    "category": "Predicted Cost Pressure",
                    "severity": "High",
                    "finding": (
                        "The current model predicts approximately "
                        f"{prediction_values['cost_overrun_pct']:.2f}% "
                        "cost overrun."
                    ),
                }
            )

        elif (
            prediction_values["cost_overrun_pct"]
            > 0
        ):

            evidence.append(
                {
                    "category": "Predicted Cost Pressure",
                    "severity": "Medium",
                    "finding": (
                        "The current model predicts approximately "
                        f"{prediction_values['cost_overrun_pct']:.2f}% "
                        "cost overrun."
                    ),
                }
            )

        # --------------------------------------------------------------
        # Schedule prediction
        # --------------------------------------------------------------

        if (
            prediction_values["delay_months"]
            > 12
        ):

            evidence.append(
                {
                    "category": "Predicted Schedule Delay",
                    "severity": "High",
                    "finding": (
                        "The current model predicts approximately "
                        f"{prediction_values['delay_months']:.1f} "
                        "months of schedule delay."
                    ),
                }
            )

        elif (
            prediction_values["delay_months"]
            > 0
        ):

            evidence.append(
                {
                    "category": "Predicted Schedule Delay",
                    "severity": "Medium",
                    "finding": (
                        "The current model predicts approximately "
                        f"{prediction_values['delay_months']:.1f} "
                        "months of schedule delay."
                    ),
                }
            )

        # --------------------------------------------------------------
        # Risk prediction
        # --------------------------------------------------------------

        if (
            prediction_values["risk_score"]
            >= 75
        ):

            evidence.append(
                {
                    "category": "Predicted Execution Risk",
                    "severity": "Critical",
                    "finding": (
                        f"Predicted execution-risk score is "
                        f"{prediction_values['risk_score']:.1f}/100."
                    ),
                }
            )

        elif (
            prediction_values["risk_score"]
            >= 50
        ):

            evidence.append(
                {
                    "category": "Predicted Execution Risk",
                    "severity": "High",
                    "finding": (
                        f"Predicted execution-risk score is "
                        f"{prediction_values['risk_score']:.1f}/100."
                    ),
                }
            )

        elif (
            prediction_values["risk_score"]
            >= 25
        ):

            evidence.append(
                {
                    "category": "Predicted Execution Risk",
                    "severity": "Medium",
                    "finding": (
                        f"Predicted execution-risk score is "
                        f"{prediction_values['risk_score']:.1f}/100."
                    ),
                }
            )

        # --------------------------------------------------------------
        # If no evidence found
        # --------------------------------------------------------------

        if not evidence:

            evidence.append(
                {
                    "category": "No Major Signal Detected",
                    "severity": "Low",
                    "finding": (
                        "No major execution signal crossed "
                        "the current advisory thresholds."
                    ),
                }
            )

        return evidence

    # ------------------------------------------------------------------
    # Recommended actions
    # ------------------------------------------------------------------

    @staticmethod
    def _recommend_actions(
        project_data: Dict[str, Any],
        predictions: Dict[str, Any],
    ) -> List[Dict[str, Any]]:

        prediction_values = (
            AIProjectAdvisor._prediction_values(
                predictions
            )
        )

        actions = []

        physical_progress = AIProjectAdvisor._number(
            project_data.get(
                "physical_progress_pct",
                project_data.get(
                    "physicalProgressPct"
                ),
            )
        )

        financial_progress = AIProjectAdvisor._number(
            project_data.get(
                "financial_progress_pct",
                project_data.get(
                    "financialProgressPct"
                ),
            )
        )

        # --------------------------------------------------------------
        # Critical / high risk
        # --------------------------------------------------------------

        if prediction_values["risk_score"] >= 75:

            actions.append(
                {
                    "priority": 1,
                    "urgency": "Immediate",
                    "action": (
                        "Initiate project-level risk review"
                    ),
                    "reason": (
                        "The predicted execution-risk score "
                        "is in the critical range."
                    ),
                }
            )

        elif prediction_values["risk_score"] >= 50:

            actions.append(
                {
                    "priority": 1,
                    "urgency": "High",
                    "action": (
                        "Increase project monitoring frequency"
                    ),
                    "reason": (
                        "The predicted execution-risk score "
                        "is in the high-risk range."
                    ),
                }
            )

        # --------------------------------------------------------------
        # Schedule
        # --------------------------------------------------------------

        if prediction_values["delay_months"] > 6:

            actions.append(
                {
                    "priority": 2,
                    "urgency": "High",
                    "action": (
                        "Review the project critical path "
                        "and delayed milestones"
                    ),
                    "reason": (
                        f"The model predicts approximately "
                        f"{prediction_values['delay_months']:.1f} "
                        "months of delay."
                    ),
                }
            )

        # --------------------------------------------------------------
        # Cost
        # --------------------------------------------------------------

        if prediction_values["cost_overrun_pct"] > 5:

            actions.append(
                {
                    "priority": 3,
                    "urgency": "High",
                    "action": (
                        "Review projected cost escalation "
                        "against the current project baseline"
                    ),
                    "reason": (
                        f"The model predicts approximately "
                        f"{prediction_values['cost_overrun_pct']:.2f}% "
                        "cost overrun."
                    ),
                }
            )

        # --------------------------------------------------------------
        # Financial / physical divergence
        # --------------------------------------------------------------

        progress_gap = (
            financial_progress
            - physical_progress
        )

        if progress_gap > 10:

            actions.append(
                {
                    "priority": 4,
                    "urgency": "High",
                    "action": (
                        "Review expenditure against "
                        "certified physical progress"
                    ),
                    "reason": (
                        f"Financial progress is approximately "
                        f"{progress_gap:.1f} percentage points "
                        "ahead of physical progress."
                    ),
                }
            )

        # --------------------------------------------------------------
        # Normal monitoring
        # --------------------------------------------------------------

        if not actions:

            actions.append(
                {
                    "priority": 1,
                    "urgency": "Routine",
                    "action": (
                        "Continue periodic project monitoring"
                    ),
                    "reason": (
                        "No major advisory threshold has "
                        "been triggered by the supplied data."
                    ),
                }
            )

        return actions

    # ------------------------------------------------------------------
    # Executive advice
    # ------------------------------------------------------------------

    @staticmethod
    def generate_project_advice(
        project_data: Dict[str, Any],
        predictions: Dict[str, Any],
    ) -> Dict[str, Any]:

        """
        Generate a grounded project intelligence report.
        """

        if not isinstance(
            project_data,
            dict,
        ):

            raise ValueError(
                "project_data must be a dictionary."
            )

        if not isinstance(
            predictions,
            dict,
        ):

            raise ValueError(
                "predictions must be a dictionary."
            )

        proj_name = (
            AIProjectAdvisor._project_name(
                project_data
            )
        )

        sector = (
            AIProjectAdvisor._sector(
                project_data
            )
        )

        agency = (
            AIProjectAdvisor._agency(
                project_data
            )
        )

        state = (
            AIProjectAdvisor._state(
                project_data
            )
        )

        prediction_values = (
            AIProjectAdvisor._prediction_values(
                predictions
            )
        )

        evidence = (
            AIProjectAdvisor._execution_evidence(
                project_data,
                predictions,
            )
        )

        actions = (
            AIProjectAdvisor._recommend_actions(
                project_data,
                predictions,
            )
        )

        # --------------------------------------------------------------
        # Executive summary
        # --------------------------------------------------------------

        exec_summary = (
            f"Project '{proj_name}' "
            f"({sector}, {state}) has a predicted "
            f"execution-risk score of "
            f"{prediction_values['risk_score']:.1f}/100 "
            f"with a risk category of "
            f"{prediction_values['risk_category']}. "
            f"The current model predicts approximately "
            f"{prediction_values['delay_months']:.1f} months "
            f"of schedule delay and "
            f"{prediction_values['cost_overrun_pct']:.2f}% "
            f"cost overrun."
        )

        # --------------------------------------------------------------
        # Strategic outlook
        # --------------------------------------------------------------

        if (
            prediction_values["risk_score"]
            >= 75
        ):

            supervision_level = (
                "Critical project-level review"
            )

        elif (
            prediction_values["risk_score"]
            >= 50
        ):

            supervision_level = (
                "Enhanced project monitoring"
            )

        elif (
            prediction_values["risk_score"]
            >= 25
        ):

            supervision_level = (
                "Focused monitoring"
            )

        else:

            supervision_level = (
                "Routine monitoring"
            )

        outlook = {
            "recommended_supervision_level":
                supervision_level,

            "predicted_schedule_delay_months":
                prediction_values[
                    "delay_months"
                ],

            "predicted_cost_overrun_pct":
                prediction_values[
                    "cost_overrun_pct"
                ],

            "predicted_cost_overrun_cr":
                prediction_values[
                    "cost_overrun_cr"
                ],

            "key_monitoring_focus": (
                "Physical progress, financial progress, "
                "schedule movement, and model-predicted risk."
            ),
        }

        # --------------------------------------------------------------
        # Final response
        # --------------------------------------------------------------

        return {
            "project": {
                "name": proj_name,
                "sector": sector,
                "agency": agency,
                "state": state,
            },

            "executive_summary":
                exec_summary,

            "risk_tier":
                prediction_values[
                    "risk_category"
                ],

            "risk_score":
                prediction_values[
                    "risk_score"
                ],

            "predicted_delay_months":
                prediction_values[
                    "delay_months"
                ],

            "predicted_cost_overrun_pct":
                prediction_values[
                    "cost_overrun_pct"
                ],

            "predicted_cost_overrun_cr":
                prediction_values[
                    "cost_overrun_cr"
                ],

            "evidence":
                evidence,

            "potential_drivers":
                [],

            "root_causes":
                [],

            "recommended_actions":
                actions,

            "mitigation_playbook":
                actions,

            "strategic_outlook":
                outlook,

            "data_grounding": {
                "source":
                    "Supplied project and model prediction context",

                "uses_unverified_external_factors":
                    False,

                "uses_synthetic_project_values":
                    False,

                "additional_variable_warning":
                    (
                        "Land acquisition, clearance, contractor, "
                        "weather, and litigation variables are not "
                        "assumed unless explicitly supplied."
                    ),
            },
        }

    # ------------------------------------------------------------------
    # Interactive Project Intelligence Q&A
    # ------------------------------------------------------------------

    @staticmethod
    def answer_query(
        query: str,
        project_context: Dict[str, Any] = None,
    ) -> str:

        """
        Answer common project-monitoring questions using only
        supplied project context.

        This is a deterministic grounded advisor.
        It does not fabricate information when a field is absent.
        """

        if not query or not query.strip():

            return (
                "Please ask a project-monitoring question "
                "such as risk, delay, cost, progress, "
                "or recommended actions."
            )

        if not project_context:

            return (
                "No project context is currently available. "
                "Select a project and provide its verified "
                "project snapshot and model prediction results."
            )

        query_lower = query.lower()

        project_name = (
            AIProjectAdvisor._project_name(
                project_context
            )
        )

        predictions = project_context.get(
            "predictions",
            project_context,
        )

        prediction_values = (
            AIProjectAdvisor._prediction_values(
                predictions
            )
        )

        # --------------------------------------------------------------
        # Risk
        # --------------------------------------------------------------

        if (
            "risk" in query_lower
            or "score" in query_lower
            or "why" in query_lower
        ):

            evidence = (
                AIProjectAdvisor._execution_evidence(
                    project_context,
                    predictions,
                )
            )

            findings = "; ".join(
                item["finding"]
                for item in evidence[:3]
            )

            return (
                f"'{project_name}' has a predicted "
                f"execution-risk score of "
                f"{prediction_values['risk_score']:.1f}/100 "
                f"({prediction_values['risk_category']}). "
                f"Current evidence: {findings}"
            )

        # --------------------------------------------------------------
        # Delay
        # --------------------------------------------------------------

        if (
            "delay" in query_lower
            or "timeline" in query_lower
            or "schedule" in query_lower
            or "when" in query_lower
        ):

            delay = prediction_values[
                "delay_months"
            ]

            return (
                f"For '{project_name}', the current "
                f"model predicts approximately "
                f"{delay:.1f} months of schedule delay."
            )

        # --------------------------------------------------------------
        # Cost
        # --------------------------------------------------------------

        if (
            "cost" in query_lower
            or "budget" in query_lower
            or "overrun" in query_lower
            or "escalat" in query_lower
        ):

            return (
                f"For '{project_name}', the current "
                f"model predicts approximately "
                f"{prediction_values['cost_overrun_pct']:.2f}% "
                f"cost overrun, equivalent to approximately "
                f"₹{prediction_values['cost_overrun_cr']:,.2f} Cr."
            )

        # --------------------------------------------------------------
        # Action / mitigation
        # --------------------------------------------------------------

        if (
            "action" in query_lower
            or "mitigat" in query_lower
            or "fix" in query_lower
            or "recommend" in query_lower
        ):

            actions = (
                AIProjectAdvisor._recommend_actions(
                    project_context,
                    predictions,
                )
            )

            action_text = " ".join(
                f"{index + 1}. {item['action']}."
                for index, item
                in enumerate(actions[:3])
            )

            return (
                f"Recommended actions for "
                f"'{project_name}': "
                f"{action_text}"
            )

        # --------------------------------------------------------------
        # Progress
        # --------------------------------------------------------------

        if (
            "progress" in query_lower
            or "physical" in query_lower
            or "financial" in query_lower
        ):

            physical = AIProjectAdvisor._number(
                project_context.get(
                    "physical_progress_pct",
                    project_context.get(
                        "physicalProgressPct"
                    ),
                )
            )

            financial = AIProjectAdvisor._number(
                project_context.get(
                    "financial_progress_pct",
                    project_context.get(
                        "financialProgressPct"
                    ),
                )
            )

            return (
                f"'{project_name}' currently has "
                f"physical progress of {physical:.1f}% "
                f"and financial progress of "
                f"{financial:.1f}% based on the supplied "
                f"project context."
            )

        # --------------------------------------------------------------
        # General response
        # --------------------------------------------------------------

        return (
            f"Current assessment for '{project_name}': "
            f"predicted risk is "
            f"{prediction_values['risk_score']:.1f}/100, "
            f"predicted delay is "
            f"{prediction_values['delay_months']:.1f} months, "
            f"and predicted cost overrun is "
            f"{prediction_values['cost_overrun_pct']:.2f}%."
        )


# ----------------------------------------------------------------------
# Simple module test
# ----------------------------------------------------------------------

if __name__ == "__main__":

    sample_project = {
        "project_name":
            "Sample Infrastructure Project",

        "sector":
            "Road Transport & Highways",

        "state":
            "Rajasthan",

        "agency":
            "MoRTH",

        "physical_progress_pct":
            65.0,

        "financial_progress_pct":
            72.0,
    }

    sample_predictions = {

        "predicted_delay_months":
            8.5,

        "predicted_cost_overrun_pct":
            6.2,

        "predicted_cost_overrun_cr":
            24.5,

        "predicted_risk_score":
            61.4,

        "risk_category":
            "HIGH",

        "model_version":
            "2.1.0",

        "feature_count":
            24,
    }

    result = (
        AIProjectAdvisor.generate_project_advice(
            sample_project,
            sample_predictions,
        )
    )

    print()
    print(
        "=== NeevAI Project Intelligence Advisor Test ==="
    )
    print()

    print(
        result["executive_summary"]
    )

    print()

    print(
        "Evidence:"
    )

    for item in result["evidence"]:

        print(
            f"- [{item['severity']}] "
            f"{item['finding']}"
        )

    print()

    print(
        "Recommended Actions:"
    )

    for item in result["recommended_actions"]:

        print(
            f"- [{item['urgency']}] "
            f"{item['action']}"
        )

    print()

    print(
        "Q&A:"
    )

    print(
        AIProjectAdvisor.answer_query(
            "Why is this project at risk?",
            {
                **sample_project,
                "predictions":
                    sample_predictions,
            },
        )
    )