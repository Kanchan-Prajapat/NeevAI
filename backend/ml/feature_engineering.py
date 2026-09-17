"""
Feature Engineering Pipeline for PAIMANA MoSPI AI
Constructs domain-specific distress indicators, drift metrics, and clearance friction vectors.
"""

import numpy as np
import pandas as pd

SECTOR_MAP = {
    "Railways": 1,
    "Road Transport & Highways": 2,
    "Power & Renewable Energy": 3,
    "Petroleum & Natural Gas": 4,
    "Coal & Mines": 5,
    "Civil Aviation": 6,
    "Urban Development & Metro Rail": 7,
    "Shipping, Ports & Waterways": 8,
    "Water Resources & Irrigation": 9,
    "Steel, Heavy Industries & Atomic Energy": 10,
    "Healthcare": 11
}

STATE_CLEARANCE_INDEX = {
    "Rajasthan": 1.15,
    "Gujarat": 1.05,
    "Maharashtra": 1.35,
    "Uttar Pradesh": 1.40,
    "Bihar": 1.55,
    "West Bengal": 1.50,
    "Madhya Pradesh": 1.20,
    "Karnataka": 1.25,
    "Tamil Nadu": 1.18,
    "Andhra Pradesh": 1.20,
    "Telangana": 1.15,
    "Odisha": 1.30,
    "Assam": 1.45,
    "Jammu & Kashmir": 1.60,
    "Delhi": 1.30,
    "Haryana": 1.20,
    "Punjab": 1.22,
    "Kerala": 1.40,
    "National": 1.25
}

FEATURE_COLUMNS = [
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
    "cost_escalation_ratio",
    "fin_phy_progress_gap",
    "milestone_delayed_ratio",
    "milestone_completion_rate",
    "statutory_clearance_burden",
    "execution_friction_index",
    "capex_scale_log",
    "sector_encoded",
    "state_clearance_factor",
    "financial_burn_ratio",
    "milestone_stress_index",
    "clearance_execution_synergy"
]

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Computes high-signal domain features for predictive models."""
    df = df.copy()
    
    # Financial Escalation
    orig_cost = np.maximum(df["original_cost_cr"].values, 1.0)
    rev_cost = np.maximum(df["revised_cost_cr"].values, orig_cost)
    df["cost_escalation_ratio"] = rev_cost / orig_cost
    
    # Financial Burn Ratio
    cum_exp = df.get("cumulative_expenditure_cr", np.zeros(len(df))).values
    df["financial_burn_ratio"] = np.clip(cum_exp / rev_cost, 0.0, 1.5)
    
    # Progress Gap (Distress marker: spending faster than physical milestones)
    df["fin_phy_progress_gap"] = df["financial_progress_pct"] - df["physical_progress_pct"]
    
    # Milestone Metrics
    tot_miles = np.maximum(df["total_milestones"].values, 1)
    comp_miles = np.maximum(df.get("completed_milestones", np.zeros(len(df))).values, 0)
    del_miles = np.maximum(df.get("delayed_milestones", np.zeros(len(df))).values, 0)
    df["milestone_delayed_ratio"] = del_miles / tot_miles
    df["milestone_completion_rate"] = comp_miles / tot_miles
    
    # Clearance & Friction
    land_del = df.get("land_acquisition_delay_months", 0.0)
    clear_del = df.get("clearance_delay_months", 0.0)
    df["statutory_clearance_burden"] = (land_del * 1.25) + clear_del
    
    cont_score = df.get("contractor_delay_score", 2.5)
    geo_score = df.get("geological_delay_score", 1.0)
    df["execution_friction_index"] = (cont_score * 0.7) + (geo_score * 0.3)
    
    # Log Scale of Capex
    df["capex_scale_log"] = np.log10(np.maximum(df["original_cost_cr"].values, 10.0))
    
    # Sector Encoding
    if "sector" in df.columns:
        df["sector_encoded"] = df["sector"].map(lambda s: SECTOR_MAP.get(s, 0))
    else:
        df["sector_encoded"] = 0

    # State Clearance Factor
    if "state_location" in df.columns:
        df["state_clearance_factor"] = df["state_location"].map(lambda st: STATE_CLEARANCE_INDEX.get(st, 1.25))
    else:
        df["state_clearance_factor"] = 1.25

    # Interaction Features
    df["milestone_stress_index"] = (del_miles / np.maximum(comp_miles, 1.0)) * (df["statutory_clearance_burden"] + 1.0)
    df["clearance_execution_synergy"] = df["statutory_clearance_burden"] * df["execution_friction_index"]
        
    return df

def get_feature_matrix(df: pd.DataFrame) -> np.ndarray:
    """Returns NumPy feature array ready for model training/inference."""
    engineered_df = engineer_features(df)
    for col in FEATURE_COLUMNS:
        if col not in engineered_df.columns:
            engineered_df[col] = 0.0
    return engineered_df[FEATURE_COLUMNS].fillna(0.0).values
