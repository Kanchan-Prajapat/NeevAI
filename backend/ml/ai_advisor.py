"""
GenAI & Strategic Advisory Engine for PAIMANA MoSPI
Generates executive root-cause diagnostics, PM-GatiShakti mitigation playbooks, and institutional flash summaries.
"""

from typing import Dict, Any, List

class AIProjectAdvisor:
    @staticmethod
    def generate_project_advice(project_data: Dict[str, Any], predictions: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generates comprehensive AI diagnostic report and mitigation roadmap for a project.
        """
        proj_name = project_data.get("project_name", "Central Infrastructure Project")
        sector = project_data.get("sector", "Infrastructure")
        agency = project_data.get("implementing_agency", "Implementing Agency")
        state = project_data.get("state_location", "State")
        
        orig_cost = float(project_data.get("original_cost_cr", 1000))
        rev_cost = float(project_data.get("revised_cost_cr", orig_cost))
        phy_prog = float(project_data.get("physical_progress_pct", 50))
        fin_prog = float(project_data.get("financial_progress_pct", 50))
        
        land_del = float(project_data.get("land_acquisition_delay_months", 0))
        clear_del = float(project_data.get("clearance_delay_months", 0))
        cont_score = float(project_data.get("contractor_delay_score", 2.5))
        
        risk_score = float(predictions.get("risk_score", 50.0))
        risk_tier = predictions.get("risk_category", "MEDIUM")
        pred_delay = float(predictions.get("predicted_delay_months", 0))
        pred_cost_overrun_cr = float(predictions.get("predicted_cost_overrun_cr", 0))
        
        # 1. Executive Summary Synthesis
        if risk_tier in ["CRITICAL", "HIGH"]:
            exec_summary = (
                f"Project '{proj_name}' ({sector}, {state}) is under severe execution stress with a Risk Score of "
                f"{risk_score}/100. The AI models forecast an impending delay of {pred_delay:.1f} months and an estimated "
                f"cost escalation of ₹{pred_cost_overrun_cr:,.2f} Cr above current sanctioned limits. Key vulnerabilities "
                f"include {land_del + clear_del:.0f} months of pending statutory clearances and an expenditure-to-physical progress "
                f"variance of {abs(fin_prog - phy_prog):.1f}%."
            )
        elif risk_tier == "MEDIUM":
            exec_summary = (
                f"Project '{proj_name}' operates under moderate schedule drift with a Risk Score of {risk_score}/100. "
                f"Forecasted delay is {pred_delay:.1f} months. Proactive intervention at the state nodal level can prevent "
                f"transition into the high-risk escalation corridor."
            )
        else:
            exec_summary = (
                f"Project '{proj_name}' exhibits healthy execution parameters with a Risk Score of {risk_score}/100. "
                f"Physical progress ({phy_prog}%) is aligned with financial utilization ({fin_prog}%). Predicted slippage "
                f"is minimal ({pred_delay:.1f} months)."
            )
            
        # 2. Root Cause Breakdown
        root_causes = []
        if land_del > 6:
            root_causes.append({
                "category": "Land Acquisition & RoW",
                "severity": "High" if land_del > 12 else "Medium",
                "finding": f"Pending land possession for {land_del:.0f} months. Right of Way (RoW) handovers lag behind EPC schedule."
            })
        if clear_del > 4:
            root_causes.append({
                "category": "Statutory Approvals",
                "severity": "High" if clear_del > 10 else "Medium",
                "finding": f"Stage-I/II forest, wildlife, or CRZ clearances pending for {clear_del:.0f} months with state authorities."
            })
        if (fin_prog - phy_prog) > 10.0:
            root_causes.append({
                "category": "Capital Efficiency Drift",
                "severity": "High",
                "finding": f"Financial burn ({fin_prog}%) significantly outpaces certified physical progress ({phy_prog}%)."
            })
        if cont_score > 5.0:
            root_causes.append({
                "category": "Contractor Mobilization",
                "severity": "High",
                "finding": f"Contractor stress rating at {cont_score:.1f}/10 indicates machinery shortages, cash flow constraints, or labor deficits."
            })
        if not root_causes:
            root_causes.append({
                "category": "Routine Operational Variance",
                "severity": "Low",
                "finding": "Standard construction milestones proceeding within baseline operational variance thresholds."
            })
            
        # 3. Actionable Mitigation Roadmap (Playbook)
        mitigation_playbook = []
        if land_del > 6 or clear_del > 4:
            mitigation_playbook.append({
                "step": 1,
                "urgency": "Immediate (Within 14 Days)",
                "action": "Trigger PM-GatiShakti Nodal Review",
                "details": f"Escalate {land_del:.0f}m land and {clear_del:.0f}m clearance bottlenecks to State Chief Secretary via PM-GatiShakti National Master Plan portal for fast-track statutory NOCs."
            })
        if (fin_prog - phy_prog) > 10.0:
            mitigation_playbook.append({
                "step": 2,
                "urgency": "High Priority (30 Days)",
                "action": "Tripartite Financial & Physical Progress Audit",
                "details": f"Commission an independent engineering audit to verify billing certifications against physical milestones to arrest premature capex outflow."
            })
        if cont_score > 5.0:
            mitigation_playbook.append({
                "step": 3,
                "urgency": "High Priority (30 Days)",
                "action": "Contractor Resource Augmentation & Escrow Restructuring",
                "details": f"Direct {agency} to establish milestone-linked direct sub-vendor payments and enforce contractor mobilization quotas under contractual liquidated damages clauses."
            })
        if not mitigation_playbook:
            mitigation_playbook.append({
                "step": 1,
                "urgency": "Routine",
                "action": "Maintain Milestone Critical-Path Monitoring",
                "details": "Continue regular monthly CUF data submission to MoSPI IPMD; maintain quarterly vendor review meetings."
            })
            
        # 4. Strategic Outlook & Projections
        outlook = {
            "recommended_supervision_level": "Cabinet Secretary / IPMD Taskforce" if risk_tier == "CRITICAL" else ("Ministry Nodal Officer" if risk_tier == "HIGH" else "CPSU Project Director"),
            "target_revised_doc_feasibility": "Unlikely without intervention" if pred_delay > 12 else "Achievable with minor rescheduling",
            "capex_risk_exposure_crores": pred_cost_overrun_cr,
            "key_kpi_to_watch": "Physical Milestone Velocity & RoW Handover Rate"
        }
        
        return {
            "executive_summary": exec_summary,
            "risk_tier": risk_tier,
            "risk_score": risk_score,
            "predicted_delay_months": pred_delay,
            "predicted_cost_overrun_cr": pred_cost_overrun_cr,
            "root_causes": root_causes,
            "mitigation_playbook": mitigation_playbook,
            "strategic_outlook": outlook
        }

    @staticmethod
    def answer_query(query: str, project_context: Dict[str, Any] = None) -> str:
        """Interactive AI Q&A engine for project queries."""
        q_lower = query.lower()
        if not project_context:
            return (
                "PAIMANA AI Assistant is monitoring Central Sector Infrastructure Projects (₹150 Cr+). "
                "You can select any project from the table or upload a CSV to receive instant risk scores, "
                "delay predictions, and customized mitigation strategies."
            )
            
        proj_name = project_context.get("project_name", "Selected Project")
        risk_score = project_context.get("target_risk_score", project_context.get("risk_score", 50.0))
        delay = project_context.get("target_time_delay_months", project_context.get("predicted_delay_months", 0))
        cost_overrun = project_context.get("target_cost_overrun_cr", project_context.get("predicted_cost_overrun_cr", 0))
        sector = project_context.get("sector", "Infrastructure")
        agency = project_context.get("implementing_agency", "CPSU")
        
        if "risk" in q_lower or "score" in q_lower or "why" in q_lower:
            return (
                f"Project '{proj_name}' has an AI Risk Score of {risk_score}/100. "
                f"The elevated score is driven by physical vs financial burn rates, clearance pendency, "
                f"and milestone slippages. Our models project a completion delay of ~{delay} months."
            )
        elif "delay" in q_lower or "timeline" in q_lower or "schedule" in q_lower or "when" in q_lower:
            return (
                f"For '{proj_name}', the AI predicts an overall delay of {delay} months beyond the original DOC. "
                f"The critical path bottleneck is primarily driven by statutory approvals and contractor mobilization velocity."
            )
        elif "cost" in q_lower or "budget" in q_lower or "overrun" in q_lower or "escalat" in q_lower:
            return (
                f"The anticipated capex cost overrun for '{proj_name}' is estimated at ₹{cost_overrun:,.2f} Crores. "
                f"We recommend an immediate contract price-escalation audit and strict milestone-linked fund disbursement."
            )
        elif "mitigat" in q_lower or "action" in q_lower or "how to" in q_lower or "fix" in q_lower:
            return (
                f"Recommended Mitigations for {agency} on '{proj_name}':\n"
                f"1. Fast-track pending Stage-I/II forest & land clearances via PM-GatiShakti state nodal cells.\n"
                f"2. Implement direct material procurement guarantees to ease contractor cash flows.\n"
                f"3. Institute fortnightly critical path review meetings with MoSPI IPMD."
            )
        else:
            return (
                f"Assessment for '{proj_name}' ({sector}): Risk Score is {risk_score}/100, "
                f"predicted delay is {delay} months, and capex overrun is ₹{cost_overrun:,.2f} Cr. "
                f"Implementing agency {agency} should prioritize statutory clearances and contractor mobilization."
            )
