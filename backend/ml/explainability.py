"""
Explainability (XAI) Engine for PAIMANA MoSPI AI
Calculates feature attribution and local risk drivers for single and batch project evaluations.
"""

import numpy as np
import pandas as pd

class ExplainabilityEngine:
    @staticmethod
    def explain_project_risk(row: pd.Series | dict) -> dict:
        """
        Computes granular percentage contributions of distinct operational vectors 
        towards the project's overall risk score and projected delay.
        """
        if isinstance(row, dict):
            row = pd.Series(row)
            
        land_del = float(row.get("land_acquisition_delay_months", 0))
        clear_del = float(row.get("clearance_delay_months", 0))
        cont_score = float(row.get("contractor_delay_score", 2.5))
        geo_score = float(row.get("geological_delay_score", 1.0))
        
        phy = float(row.get("physical_progress_pct", 50.0))
        fin = float(row.get("financial_progress_pct", 50.0))
        gap = max(0.0, fin - phy)
        
        tot_miles = max(1.0, float(row.get("total_milestones", 10)))
        del_miles = float(row.get("delayed_milestones", 0))
        milestone_ratio = (del_miles / tot_miles) * 100.0
        
        # Raw weights for 5 risk vectors
        v_clearance = (land_del * 2.5) + (clear_del * 2.0)
        v_financial_gap = gap * 1.8
        v_milestone_lag = milestone_ratio * 1.2
        v_contractor = (cont_score * 8.0) + (geo_score * 3.0)
        v_baseline = 10.0  # Base structural / sector complexity
        
        total_raw = v_clearance + v_financial_gap + v_milestone_lag + v_contractor + v_baseline
        if total_raw <= 0:
            total_raw = 1.0
            
        pct_clearance = round((v_clearance / total_raw) * 100.0, 1)
        pct_financial = round((v_financial_gap / total_raw) * 100.0, 1)
        pct_milestones = round((v_milestone_lag / total_raw) * 100.0, 1)
        pct_contractor = round((v_contractor / total_raw) * 100.0, 1)
        pct_baseline = round(max(0.0, 100.0 - (pct_clearance + pct_financial + pct_milestones + pct_contractor)), 1)
        
        # Identify Primary Risk Driver
        drivers = [
            ("Statutory Land & Clearances", pct_clearance, f"Accumulated {land_del + clear_del:.0f} months in RoW and clearance delays."),
            ("Contractor & Engineering Friction", pct_contractor, f"Contractor stress rating at {cont_score}/10 with site obstacles."),
            ("Financial vs Physical Progress Gap", pct_financial, f"Expenditure exceeds certified physical work by {gap:.1f}%."),
            ("Milestone Schedule Slippage", pct_milestones, f"{del_miles:.0f} out of {tot_miles:.0f} key milestones currently delayed.")
        ]
        drivers.sort(key=lambda x: x[1], reverse=True)
        top_driver_name, top_driver_pct, top_driver_desc = drivers[0]
        
        return {
            "top_driver": top_driver_name,
            "top_driver_contribution_pct": top_driver_pct,
            "top_driver_description": top_driver_desc,
            "breakdown": [
                {"factor": "Statutory & Land Clearances", "contribution_pct": pct_clearance, "status": "Critical" if pct_clearance > 30 else "Moderate"},
                {"factor": "Contractor & Site Execution", "contribution_pct": pct_contractor, "status": "Critical" if pct_contractor > 30 else "Moderate"},
                {"factor": "Financial vs Physical Progress Drift", "contribution_pct": pct_financial, "status": "Critical" if pct_financial > 25 else "Moderate"},
                {"factor": "Milestone Slippage Ratio", "contribution_pct": pct_milestones, "status": "Critical" if pct_milestones > 25 else "Moderate"},
                {"factor": "Structural & Sector Complexity", "contribution_pct": pct_baseline, "status": "Normal"}
            ]
        }
