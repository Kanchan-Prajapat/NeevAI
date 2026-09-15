# NeevAI – AI-Powered Infrastructure Decision Intelligence Platform

NeevAI is an AI-powered infrastructure project monitoring and decision-intelligence platform developed for **Smart India Hackathon 2026 – Problem Statement SIH26103**.

> **Core idea:** Predict → Explain → Compare → Prioritise → Recommend

## Problem

Infrastructure projects can suffer from schedule delays, cost overruns, slow physical progress, low financial utilisation, repeated revisions, and implementation bottlenecks. NeevAI is designed to move monitoring from reactive reporting toward predictive and proactive decision support.

## Current Status

### Implemented / Built

- React + TypeScript project dashboard
- Dashboard layout and overview
- Project listing and search/filtering
- Project analytics integration
- Add Project form
- Edit Project form
- Project Details view
- Loading and error states
- Dashboard refresh
- Shared TypeScript types
- Service-based API integration
- Node.js + TypeScript + Express backend foundation
- MongoDB + Mongoose data architecture
- Project, snapshot, outcome and import-log model structure
- Validation and CSV data-import architecture
- Source-traceable project data structure
- Analytics/risk service foundation

The current Projects interface loads dashboard analytics, supports project search, opens project details, and provides add/edit workflows. The dashboard provides total, ongoing, delayed and completed project summaries.

## Solution

NeevAI acts as an intelligence layer over infrastructure project-monitoring data. It combines project master information, periodic snapshots, historical performance, financial/physical progress and schedule information.

The intended intelligence pipeline is:

```text
PAIMANA / Historical Data
          ↓
     Data Cleaning
          ↓
   Feature Engineering
          ↓
    Baseline Models
          ↓
      ML Models
          ↓
   Model Evaluation
          ↓
   Prediction Service
          ↓
     Risk Scoring
          ↓
 Early Warning Engine
          ↓
 Explainable AI
          ↓
     Dashboard
```

## Architecture

```text
Data Sources
     ↓
CSV / Data Import
     ↓
Validation & Deduplication
     ↓
MongoDB
     ↓
Analytics & Derived Metrics
     ↓
AI / ML Prediction
     ↓
Risk Scoring
     ↓
Early Warnings + Explainability
     ↓
NeevAI Dashboard
```

## Data Architecture

### Project Master

Stores stable information such as:

- Project ID
- Project Name
- Domain / Sector
- Project Type
- Ministry / Department
- Implementing Agency
- State / Location
- Original Cost
- Original Completion Date
- Data Source

### Project Snapshots

Each reporting period is preserved as a separate record:

- Project ID
- Report Type
- Report Period
- Report Date
- Original Cost
- Revised Cost
- Anticipated Cost
- Cumulative Expenditure
- Physical Progress
- Project Status
- Remarks
- Source Report
- Source Page

### Project Outcomes

Designed to store final project information such as final status, final cost, final schedule, risk level and summary.

### Import Logging

The backend includes an `ImportLog` model for tracking import type, source file, total/valid/imported/skipped/failed records, status, timestamps and errors.

## Analytics

The analytics layer is designed to calculate:

- Cost change
- Cost overrun percentage
- Expenditure percentage
- Schedule delay
- Completion-date shift
- Progress velocity
- Progress slowdown
- Financial progress
- Cost variance
- Schedule variance
- Actual vs expected velocity
- Cost risk
- Velocity risk
- Efficiency risk
- Overall project risk

## Risk Intelligence

The proposed risk framework combines multiple signals:

```text
Overall Risk Score =
40% Schedule Risk
+ 30% Cost Risk
+ 20% Progress Risk
+ 10% Historical Risk
```

The weights are intended to be configurable and validated rather than treated as permanent constants.

## Early Warning Engine

Examples of intended rules:

```text
Delay Probability > 80%
        ↓
Critical Schedule Alert
```

```text
Cost Overrun Probability > 75%
        ↓
High Cost Risk Alert
```

```text
Physical Progress Gap > Threshold
        ↓
Progress Deviation Alert
```

The engine can combine ML predictions, statistical anomalies, business rules and historical thresholds.

## Explainable AI

NeevAI is designed to explain predictions rather than behave as a black box.

Potential outputs:

- Global feature importance
- Project-specific risk drivers
- Cost escalation factors
- Delay risk factors

**SHAP** is planned for model explainability.

## Project Intelligence Assistant

An advanced LLM assistant is planned to provide natural-language access to verified project intelligence.

Example questions:

- Which projects have the highest delay risk?
- Why is a project considered high risk?
- Which sector has the highest cost escalation risk?
- How does a project compare with similar projects?
- Which projects require immediate intervention?

The LLM should not independently generate predictions. The intended flow is:

```text
User Query
    ↓
LLM Understanding
    ↓
Database / Analytics / ML Query
    ↓
Verified Results
    ↓
Natural Language Explanation
```

## ML Strategy

Potential targets:

- Cost overrun percentage / yes-no
- Time overrun days / yes-no
- Overall implementation risk

Potential features:

- Expenditure ratio
- Financial progress gap
- Cost revision count
- Spending velocity
- Time elapsed ratio
- Schedule progress gap
- Extension history
- Physical progress
- Financial progress
- Progress velocity
- Reporting consistency
- Sector
- Location
- Project size
- Implementing agency

Models being considered:

- Linear Regression
- Logistic Regression
- Random Forest
- Gradient Boosting
- XGBoost
- LightGBM

Evaluation metrics include Accuracy, Precision, Recall, F1, ROC-AUC, MAE, RMSE and R² as appropriate.

## Data Import

The backend import architecture is organised around:

```text
backend/
├── data/
│   ├── templates/
│   ├── imports/
│   │   ├── projects/
│   │   ├── snapshots/
│   │   └── outcomes/
│   ├── processed/
│   └── errors/
├── src/
│   ├── constants/
│   ├── models/
│   ├── validators/
│   ├── services/
│   ├── routes/
│   └── utils/
└── scripts/
```

Important data rules:

- Do not invent missing source data.
- Keep official project IDs as text.
- Store costs in INR crore.
- Store percentages numerically.
- Preserve reporting periods.
- Keep historical snapshots instead of overwriting them.
- Maintain source-report traceability.
- Prefer official project IDs for project matching.

## Technology Stack

### Frontend
- React
- TypeScript
- CSS
- Lucide React

### Backend
- Node.js
- TypeScript
- Express
- MongoDB
- Mongoose

### AI / Data
- Python
- Pandas
- NumPy
- Scikit-learn
- Random Forest
- Gradient Boosting
- XGBoost
- LightGBM
- SHAP
- Joblib

### AI API / Advanced Layer
- FastAPI
- Ollama / open-source LLM

### Deployment
- Docker
- Docker Compose
- Vercel / Render or equivalent prototype deployment

## Dashboard Vision

The final dashboard is intended to provide:

- Total monitored projects
- Ongoing, completed and delayed projects
- Low / Medium / High / Critical risk counts
- Predicted delayed projects
- Predicted cost-overrun projects
- Risk distribution
- Cost trends
- Schedule performance
- Sector comparison
- Geographic risk distribution
- High-risk project ranking
- Project-level intelligence

## Target MVP

1. Project monitoring dashboard
2. Project-level data management
3. Cost-overrun prediction
4. Time-overrun prediction
5. Unified project risk score
6. Risk categories
7. Risk drivers
8. Early-warning alerts
9. High-risk project prioritisation
10. Project-level intelligence

## Roadmap

- Complete analytics recalculation pipeline
- Finalise risk-score computation
- Complete and evaluate prediction models
- Add SHAP explanations
- Complete early-warning automation
- Add comparative analytics
- Add geographic visualisation
- Deploy prediction API
- Integrate LLM project assistant
- Production deployment
- Automated data synchronisation where supported

## Project Information

| Field | Value |
|---|---|
| Project | NeevAI |
| Event | Smart India Hackathon 2026 |
| Problem Statement | SIH26103 |
| Category | Software |
| Theme | Smart Automation |
| Team | Nexus |
| Domain | Infrastructure Project Monitoring |

## References

The project is based primarily on PAIMANA project-monitoring reports and structured government infrastructure project data.

## Development Note

NeevAI is an evolving prototype. The dashboard and project-management foundation are implemented, while the complete predictive AI/ML, explainability, early-warning and LLM layers are being developed incrementally. This README intentionally separates implemented functionality from advanced planned capabilities.
