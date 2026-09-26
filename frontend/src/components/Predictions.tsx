import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  BrainCircuit,
  Calculator,
  ChevronDown,
  Clock3,
  IndianRupee,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

import DashboardLayout from "./DashboardLayout";

import {
  getDashboardAnalytics,
} from "../services/projectAnalyticsService";

import type {
  ProjectDashboardItem,
} from "../services/projectAnalyticsService";

import {
  getAllProjectSnapshots,
} from "../services/projectSnapshotService";

import type {
  ProjectSnapshot,
} from "../../../shared/types";



import {
  getMLProjectPrediction,
  runWhatIfPrediction,
} from "../services/predictionService";

import type {
  MLProjectPredictionResponse,
  MLScenarioPredictionResponse,
} from "../services/predictionService";


import "./Predictions.css";


/* =========================================================
   SCENARIO STATE
========================================================= */

interface ScenarioValues {
  originalCostCr: number;
  cumulativeExpenditureCr: number;
  physicalProgressPct: number;

  totalMilestones: number;
  completedMilestones: number;
  delayedMilestones: number;

  landAcquisitionDelayMonths: number;
  clearanceDelayMonths: number;

  contractorDelayScore: number;
  geologicalDelayScore: number;
}


/* =========================================================
   HELPERS
========================================================= */

const getTimestampMilliseconds = (
  value: unknown
): number => {

  if (!value) {
    return 0;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (
      value as {
        toDate?: unknown;
      }
    ).toDate === "function"
  ) {
    return (
      value as {
        toDate: () => Date;
      }
    )
      .toDate()
      .getTime();
  }

  if (typeof value === "string") {
    const time = new Date(value).getTime();

    return Number.isNaN(time)
      ? 0
      : time;
  }

  return 0;
};


const getLatestSnapshot = (
  snapshots: ProjectSnapshot[]
): ProjectSnapshot | null => {

  if (snapshots.length === 0) {
    return null;
  }

  return snapshots.reduce(
    (
      latest,
      current
    ) => {

      const latestTime =
        getTimestampMilliseconds(
          latest.reportDate
        );

      const currentTime =
        getTimestampMilliseconds(
          current.reportDate
        );

      return currentTime > latestTime
        ? current
        : latest;
    }
  );
};


const formatNumber = (
  value: number | null | undefined,
  decimals = 1
): string => {

  if (
    value === null ||
    value === undefined ||
    Number.isNaN(value)
  ) {
    return "—";
  }

  return value.toFixed(decimals);
};


const getChange = (
  current: number | null | undefined,
  scenarioValue: number | null | undefined
): number | null => {
  if (
    current === null ||
    current === undefined ||
    scenarioValue === null ||
    scenarioValue === undefined
  ) {
    return null;
  }

  return scenarioValue - current;
};


const formatChange = (
  change: number | null,
  decimals = 1
): string => {
  if (change === null) {
    return "—";
  }

  const sign = change > 0 ? "+" : "";

  return `${sign}${change.toFixed(decimals)}`;
};


const getImpactClass = (
  change: number | null
): "positive" | "negative" | "neutral" => {
  if (change === null || change === 0) {
    return "neutral";
  }

  return change < 0
    ? "positive"
    : "negative";
};


interface ScenarioDriver {
  label: string;
  current: number;
  scenario: number;
  unit: string;
  direction: "positive" | "negative" | "neutral";
  explanation: string;
}


const getScenarioDrivers = (
  snapshot: ProjectSnapshot,
  scenarioValues: ScenarioValues
): ScenarioDriver[] => {

  const drivers: ScenarioDriver[] = [];

  const addDriver = (
    label: string,
    current: number,
    scenarioValue: number,
    unit: string,
    direction: "positive" | "negative" | "neutral",
    explanation: string
  ) => {

    if (current === scenarioValue) {
      return;
    }

    drivers.push({
      label,
      current,
      scenario: scenarioValue,
      unit,
      direction,
      explanation,
    });
  };


  addDriver(
    "Physical Progress",
    snapshot.physicalProgressPct ?? 0,
    scenarioValues.physicalProgressPct,
    "%",
    scenarioValues.physicalProgressPct >
      (snapshot.physicalProgressPct ?? 0)
      ? "positive"
      : "negative",
    scenarioValues.physicalProgressPct >
      (snapshot.physicalProgressPct ?? 0)
      ? "Higher progress partially offsets execution pressure."
      : "Lower progress increases schedule pressure."
  );


  addDriver(
    "Completed Milestones",
    snapshot.completedMilestones ?? 0,
    scenarioValues.completedMilestones,
    "",
    scenarioValues.completedMilestones >
      (snapshot.completedMilestones ?? 0)
      ? "positive"
      : "negative",
    scenarioValues.completedMilestones >
      (snapshot.completedMilestones ?? 0)
      ? "More milestones are completed in this scenario."
      : "Fewer milestones are completed in this scenario."
  );


  addDriver(
    "Delayed Milestones",
    snapshot.delayedMilestones ?? 0,
    scenarioValues.delayedMilestones,
    "",
    scenarioValues.delayedMilestones <
      (snapshot.delayedMilestones ?? 0)
      ? "positive"
      : "negative",
    scenarioValues.delayedMilestones >
      (snapshot.delayedMilestones ?? 0)
      ? "More delayed milestones increase execution pressure."
      : "Fewer delayed milestones reduce execution pressure."
  );


  addDriver(
    "Land Acquisition Delay",
    snapshot.landAcquisitionDelayMonths ?? 0,
    scenarioValues.landAcquisitionDelayMonths,
    " months",
    scenarioValues.landAcquisitionDelayMonths <
      (snapshot.landAcquisitionDelayMonths ?? 0)
      ? "positive"
      : "negative",
    scenarioValues.landAcquisitionDelayMonths >
      (snapshot.landAcquisitionDelayMonths ?? 0)
      ? "Higher land-acquisition delay increases schedule pressure."
      : "Lower land-acquisition delay reduces schedule pressure."
  );


  addDriver(
    "Clearance Delay",
    snapshot.clearanceDelayMonths ?? 0,
    scenarioValues.clearanceDelayMonths,
    " months",
    scenarioValues.clearanceDelayMonths <
      (snapshot.clearanceDelayMonths ?? 0)
      ? "positive"
      : "negative",
    scenarioValues.clearanceDelayMonths >
      (snapshot.clearanceDelayMonths ?? 0)
      ? "Higher clearance delay increases execution friction."
      : "Lower clearance delay reduces execution friction."
  );


  addDriver(
    "Contractor Delay Score",
    snapshot.contractorDelayScore ?? 0,
    scenarioValues.contractorDelayScore,
    "",
    scenarioValues.contractorDelayScore <
      (snapshot.contractorDelayScore ?? 0)
      ? "positive"
      : "negative",
    scenarioValues.contractorDelayScore >
      (snapshot.contractorDelayScore ?? 0)
      ? "Higher contractor delay increases execution risk."
      : "Lower contractor delay reduces execution risk."
  );


  addDriver(
    "Geological Delay Score",
    snapshot.geologicalDelayScore ?? 0,
    scenarioValues.geologicalDelayScore,
    "",
    scenarioValues.geologicalDelayScore <
      (snapshot.geologicalDelayScore ?? 0)
      ? "positive"
      : "negative",
    scenarioValues.geologicalDelayScore >
      (snapshot.geologicalDelayScore ?? 0)
      ? "Higher geological delay increases execution pressure."
      : "Lower geological delay reduces execution pressure."
  );


  addDriver(
    "Original Cost",
    snapshot.originalCostCr ?? 0,
    scenarioValues.originalCostCr,
    " Cr",
    "neutral",
    "The simulated project cost baseline was changed."
  );


  addDriver(
    "Cumulative Expenditure",
    snapshot.cumulativeExpenditureCr ?? 0,
    scenarioValues.cumulativeExpenditureCr,
    " Cr",
    "neutral",
    "The simulated cumulative expenditure was changed."
  );


  addDriver(
    "Total Milestones",
    snapshot.totalMilestones ?? 0,
    scenarioValues.totalMilestones,
    "",
    "neutral",
    "The simulated milestone baseline was changed."
  );


  return drivers;
};


const createScenarioFromSnapshot = (
  snapshot: ProjectSnapshot
): ScenarioValues => {

  return {

    originalCostCr:
      snapshot.originalCostCr ?? 0,

    cumulativeExpenditureCr:
      snapshot.cumulativeExpenditureCr ?? 0,

    physicalProgressPct:
      snapshot.physicalProgressPct ?? 0,

    totalMilestones:
      snapshot.totalMilestones ?? 0,

    completedMilestones:
      snapshot.completedMilestones ?? 0,

    delayedMilestones:
      snapshot.delayedMilestones ?? 0,

    landAcquisitionDelayMonths:
      snapshot.landAcquisitionDelayMonths ?? 0,

    clearanceDelayMonths:
      snapshot.clearanceDelayMonths ?? 0,

    contractorDelayScore:
      snapshot.contractorDelayScore ?? 0,

    geologicalDelayScore:
      snapshot.geologicalDelayScore ?? 0,
  };
};


/* =========================================================
   COMPONENT
========================================================= */

function Predictions() {

  const [
    projects,
    setProjects,
  ] = useState<ProjectDashboardItem[]>([]);


  const [
    snapshots,
    setSnapshots,
  ] = useState<ProjectSnapshot[]>([]);


  const [
    selectedProjectId,
    setSelectedProjectId,
  ] = useState("");


  const [
    currentPrediction,
    setCurrentPrediction,
  ] =
    useState<MLProjectPredictionResponse | null>(
      null
    );


  const [
    scenario,
    setScenario,
  ] = useState<ScenarioValues | null>(
    null
  );


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    predictionLoading,
    setPredictionLoading,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState<string | null>(null);


  const [
    predictionError,
    setPredictionError,
  ] = useState<string | null>(null);

  /* =======================================================
     WHAT-IF SCENARIO RESULT
  ======================================================= */

  const [
    scenarioPrediction,
    setScenarioPrediction,
  ] = useState<MLScenarioPredictionResponse | null>(
    null
  );

  const [
    scenarioLoading,
    setScenarioLoading,
  ] = useState(false);

  const [
    scenarioError,
    setScenarioError,
  ] = useState<string | null>(null);

  /* =======================================================
     LOAD PROJECTS + SNAPSHOTS
  ======================================================= */

  useEffect(() => {

    const loadData = async () => {

      try {

        setLoading(true);
        setError(null);

        const [
          analytics,
          allSnapshots,
        ] = await Promise.all([

          getDashboardAnalytics(),

          getAllProjectSnapshots(),

        ]);


        setProjects(
          analytics.projects
        );

        setSnapshots(
          allSnapshots
        );


        if (
          analytics.projects.length > 0
        ) {

          setSelectedProjectId(
            analytics.projects[0].projectId
          );
        }

      } catch (err) {

        console.error(
          "Failed to load prediction data:",
          err
        );

        setError(
          "Failed to load prediction data."
        );

      } finally {

        setLoading(false);

      }

    };


    loadData();

  }, []);


  /* =======================================================
     SELECTED PROJECT
  ======================================================= */

  const selectedProject =
    useMemo(() => {

      return projects.find(
        project =>
          project.projectId ===
          selectedProjectId
      ) ?? null;

    }, [
      projects,
      selectedProjectId,
    ]);


  /* =======================================================
     LATEST SNAPSHOT
  ======================================================= */

  const latestSnapshot =
    useMemo(() => {

      if (!selectedProjectId) {
        return null;
      }

      const projectSnapshots =
        snapshots.filter(
          snapshot =>
            snapshot.projectId ===
            selectedProjectId
        );

      return getLatestSnapshot(
        projectSnapshots
      );

    }, [
      snapshots,
      selectedProjectId,
    ]);


  /* =======================================================
     LOAD CURRENT ML PREDICTION
  ======================================================= */

  useEffect(() => {

    if (!selectedProjectId) {
      setCurrentPrediction(null);
      setScenario(null);
      return;
    }


    const loadPrediction = async () => {

      try {

        setPredictionLoading(true);

        setPredictionError(null);

        const result =
          await getMLProjectPrediction(
            selectedProjectId
          );

        setCurrentPrediction(
          result
        );

      } catch (err) {

        console.error(
          "Failed to load ML prediction:",
          err
        );

        setCurrentPrediction(
          null
        );

        setPredictionError(
          err instanceof Error
            ? err.message
            : "Prediction unavailable."
        );

      } finally {

        setPredictionLoading(
          false
        );

      }

    };


    loadPrediction();

  }, [
    selectedProjectId,
  ]);


  /* =======================================================
     PREFILL SCENARIO
  ======================================================= */

  useEffect(() => {

    if (!latestSnapshot) {
      setScenario(null);
      return;
    }

    setScenario(
      createScenarioFromSnapshot(
        latestSnapshot
      )
    );

  }, [
    latestSnapshot,
  ]);


  /* =======================================================
     UPDATE SCENARIO
  ======================================================= */

  const updateScenario = (
    field: keyof ScenarioValues,
    value: number
  ) => {

    setScenario(
      current => {

        if (!current) {
          return current;
        }

        return {
          ...current,
          [field]: value,
        };

      }
    );

  };


  /* =======================================================
     RESET SCENARIO
  ======================================================= */

  const resetScenario = () => {

    if (!latestSnapshot) {
      return;
    }

    setScenario(
      createScenarioFromSnapshot(
        latestSnapshot
      )
    );

  };


  /* =======================================================
     RUN WHAT-IF PREDICTION
  ======================================================= */

  const handleRunWhatIf = async () => {

    if (!selectedProjectId) {
      setScenarioError(
        "Please select a project first."
      );

      return;
    }

    if (!latestSnapshot) {
      setScenarioError(
        "No snapshot available for this project."
      );

      return;
    }

    if (!scenario) {
      setScenarioError(
        "Scenario data is not available."
      );

      return;
    }

    try {

      setScenarioLoading(true);
      setScenarioError(null);
      setScenarioPrediction(null);

      const result =
        await runWhatIfPrediction(
          selectedProjectId,
          scenario
        );

      setScenarioPrediction(
        result
      );

    } catch (err) {

      console.error(
        "What-if prediction failed:",
        err
      );

      setScenarioError(
        err instanceof Error
          ? err.message
          : "What-if prediction failed."
      );

    } finally {

      setScenarioLoading(false);

    }
  };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {

    return (

      <DashboardLayout>

        <div className="predictions-page">

          <div className="prediction-message">

            Loading prediction workspace...

          </div>

        </div>

      </DashboardLayout>

    );

  }


  /* =======================================================
     ERROR
  ======================================================= */

  if (error) {

    return (

      <DashboardLayout>

        <div className="predictions-page">

          <div className="prediction-message prediction-error">

            <AlertTriangle
              size={22}
            />

            <p>
              {error}
            </p>

          </div>

        </div>

      </DashboardLayout>

    );

  }


  /* =======================================================
     MAIN UI
  ======================================================= */

  return (

    <DashboardLayout>

      <div className="predictions-page">


        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <div className="predictions-header">

          <div>

            <div className="prediction-title-row">

              <div className="prediction-title-icon">

                <BrainCircuit
                  size={24}
                />

              </div>

              <div>

                <h2>
                  AI Predictions
                </h2>

                <p>
                  Predict project outcomes and test temporary
                  what-if scenarios.
                </p>

              </div>

            </div>

          </div>


          <div className="simulation-badge">

            <SlidersHorizontal
              size={15}
            />

            Simulation Workspace

          </div>

        </div>



        {/* =================================================
            PROJECT SELECTOR
        ================================================= */}

        <section className="prediction-card project-selector-card">

          <div className="section-heading">

            <div>

              <span className="section-eyebrow">
                SELECT PROJECT
              </span>

              <h3>
                Choose a project to analyse
              </h3>

            </div>

          </div>


          <div className="project-select-wrapper">

            <select
              value={selectedProjectId}
              onChange={event =>
                setSelectedProjectId(
                  event.target.value
                )
              }
              className="project-select"
            >

              <option value="">
                Select a project
              </option>

              {projects.map(
                project => (

                  <option
                    key={project.projectId}
                    value={project.projectId}
                  >

                    {project.projectId}
                    {" — "}
                    {project.projectName}

                  </option>

                )
              )}

            </select>


            <ChevronDown
              size={18}
              className="project-select-icon"
            />

          </div>


          {selectedProject && (

            <div className="selected-project-meta">

              <span>
                Project ID:
                {" "}
                <strong>
                  {selectedProject.projectId}
                </strong>
              </span>

              <span>
                Domain:
                {" "}
                <strong>
                  {selectedProject.domain}
                </strong>
              </span>

              <span>
                Agency:
                {" "}
                <strong>
                  {selectedProject.implementingAgency ?? "—"}
                </strong>
              </span>

              <span>
                State:
                {" "}
                <strong>
                  {selectedProject.state ?? "—"}
                </strong>
              </span>

            </div>

          )}

        </section>



        {/* =================================================
            CURRENT PREDICTION
        ================================================= */}

        <section className="prediction-card">

          <div className="section-heading">

            <div>

              <span className="section-eyebrow">
                CURRENT PREDICTION
              </span>

              <h3>
                Latest model assessment
              </h3>

            </div>


            {currentPrediction && (

              <span className="model-version">

                Model
                {" "}
                {currentPrediction.prediction.model_version}

              </span>

            )}

          </div>


          {predictionLoading ? (

            <div className="prediction-inline-loading">

              <RefreshCw
                size={18}
                className="spin-icon"
              />

              Loading prediction...

            </div>

          ) : predictionError ? (

            <div className="prediction-inline-error">

              <AlertTriangle
                size={18}
              />

              <span>
                {predictionError}
              </span>

            </div>

          ) : currentPrediction ? (

            <>

              <div className="prediction-grid">


                <div className="prediction-metric">

                  <div className="metric-icon delay">

                    <Clock3
                      size={20}
                    />

                  </div>

                  <span>
                    Predicted Delay
                  </span>

                  <strong>

                    {formatNumber(
                      currentPrediction
                        .prediction
                        .predicted_delay_months
                    )}

                    <small>
                      {" "}
                      months
                    </small>

                  </strong>

                </div>



                <div className="prediction-metric">

                  <div className="metric-icon cost">

                    <IndianRupee
                      size={20}
                    />

                  </div>

                  <span>
                    Cost Overrun
                  </span>

                  <strong>

                    {formatNumber(
                      currentPrediction
                        .prediction
                        .predicted_cost_overrun_pct,
                      2
                    )}

                    <small>
                      %
                    </small>

                  </strong>

                </div>



                <div className="prediction-metric">

                  <div className="metric-icon amount">

                    <Calculator
                      size={20}
                    />

                  </div>

                  <span>
                    Estimated Overrun
                  </span>

                  <strong>

                    ₹
                    {" "}
                    {formatNumber(
                      currentPrediction
                        .prediction
                        .predicted_cost_overrun_cr,
                      2
                    )}

                    <small>
                      {" "}
                      Cr
                    </small>

                  </strong>

                </div>



                <div className="prediction-metric">

                  <div className="metric-icon risk">

                    <ShieldCheck
                      size={20}
                    />

                  </div>

                  <span>
                    Risk Score
                  </span>

                  <strong>

                    {formatNumber(
                      currentPrediction
                        .prediction
                        .predicted_risk_score
                    )}

                    <small>
                      /100
                    </small>

                  </strong>

                  <em
                    className={
                      `risk-badge ${
                        currentPrediction
                          .prediction
                          .risk_category
                          .toLowerCase()
                      }`
                    }
                  >

                    {
                      currentPrediction
                        .prediction
                        .risk_category
                    }

                  </em>

                </div>


              </div>


              <div className="prediction-meta">

                <span>
                  Prediction based on:
                  {" "}
                  {currentPrediction.snapshot.reportPeriod}
                </span>

                <span>
                  Features:
                  {" "}
                  {currentPrediction.prediction.feature_count}
                </span>

              </div>

            </>

          ) : (

            <div className="prediction-empty">

              Select a project with
              available prediction data.

            </div>

          )}

        </section>



        {/* =================================================
            WHAT-IF SCENARIO
        ================================================= */}

        <section className="prediction-card scenario-card">

          <div className="section-heading">

            <div>

              <span className="section-eyebrow">
                WHAT-IF SCENARIO
              </span>

              <h3>
                Test changes before making a decision
              </h3>

              <p className="section-description">

                Adjust project conditions temporarily to
                understand how changes may affect prediction.

              </p>

            </div>


            <button
              type="button"
              className="reset-scenario-button"
              onClick={resetScenario}
              disabled={!scenario}
            >

              <RefreshCw
                size={16}
              />

              Reset

            </button>

          </div>


          {!scenario ? (

            <div className="scenario-empty">

              Select a project with snapshot data to
              initialise the scenario controls.

            </div>

          ) : (

            <div className="scenario-grid">


              {/* COST */}

              <div className="scenario-control">

                <div className="scenario-label">

                  <label>
                    Original Cost
                  </label>

                  <strong>
                    ₹
                    {" "}
                    {formatNumber(
                      scenario.originalCostCr,
                      2
                    )}
                    {" "}
                    Cr
                  </strong>

                </div>

                <input
                  type="range"
                  min="0"
                  max={Math.max(
                    scenario.originalCostCr * 2,
                    100
                  )}
                  step="0.01"
                  value={scenario.originalCostCr}
                  onChange={event =>
                    updateScenario(
                      "originalCostCr",
                      Number(event.target.value)
                    )
                  }
                />

              </div>



              {/* EXPENDITURE */}

              <div className="scenario-control">

                <div className="scenario-label">

                  <label>
                    Cumulative Expenditure
                  </label>

                  <strong>
                    ₹
                    {" "}
                    {formatNumber(
                      scenario.cumulativeExpenditureCr,
                      2
                    )}
                    {" "}
                    Cr
                  </strong>

                </div>

                <input
                  type="range"
                  min="0"
                  max={Math.max(
                    scenario.originalCostCr * 1.5,
                    100
                  )}
                  step="0.01"
                  value={scenario.cumulativeExpenditureCr}
                  onChange={event =>
                    updateScenario(
                      "cumulativeExpenditureCr",
                      Number(event.target.value)
                    )
                  }
                />

              </div>



              {/* PHYSICAL PROGRESS */}

              <div className="scenario-control">

                <div className="scenario-label">

                  <label>
                    Physical Progress
                  </label>

                  <strong>
                    {formatNumber(
                      scenario.physicalProgressPct
                    )}
                    %
                  </strong>

                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={scenario.physicalProgressPct}
                  onChange={event =>
                    updateScenario(
                      "physicalProgressPct",
                      Number(event.target.value)
                    )
                  }
                />

              </div>



              {/* TOTAL MILESTONES */}

              <div className="scenario-control">

                <div className="scenario-label">

                  <label>
                    Total Milestones
                  </label>

                  <strong>
                    {scenario.totalMilestones}
                  </strong>

                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={scenario.totalMilestones}
                  onChange={event =>
                    updateScenario(
                      "totalMilestones",
                      Number(event.target.value)
                    )
                  }
                />

              </div>



              {/* COMPLETED MILESTONES */}

              <div className="scenario-control">

                <div className="scenario-label">

                  <label>
                    Completed Milestones
                  </label>

                  <strong>
                    {scenario.completedMilestones}
                  </strong>

                </div>

                <input
                  type="range"
                  min="0"
                  max={Math.max(
                    scenario.totalMilestones,
                    1
                  )}
                  step="1"
                  value={Math.min(
                    scenario.completedMilestones,
                    scenario.totalMilestones
                  )}
                  onChange={event =>
                    updateScenario(
                      "completedMilestones",
                      Number(event.target.value)
                    )
                  }
                />

              </div>



              {/* DELAYED MILESTONES */}

              <div className="scenario-control">

                <div className="scenario-label">

                  <label>
                    Delayed Milestones
                  </label>

                  <strong>
                    {scenario.delayedMilestones}
                  </strong>

                </div>

                <input
                  type="range"
                  min="0"
                  max={Math.max(
                    scenario.totalMilestones,
                    1
                  )}
                  step="1"
                  value={Math.min(
                    scenario.delayedMilestones,
                    scenario.totalMilestones
                  )}
                  onChange={event =>
                    updateScenario(
                      "delayedMilestones",
                      Number(event.target.value)
                    )
                  }
                />

              </div>



              {/* LAND ACQUISITION */}

              <div className="scenario-control">

                <div className="scenario-label">

                  <label>
                    Land Acquisition Delay
                  </label>

                  <strong>
                    {formatNumber(
                      scenario.landAcquisitionDelayMonths
                    )}
                    {" "}
                    months
                  </strong>

                </div>

                <input
                  type="range"
                  min="0"
                  max="36"
                  step="0.1"
                  value={
                    scenario.landAcquisitionDelayMonths
                  }
                  onChange={event =>
                    updateScenario(
                      "landAcquisitionDelayMonths",
                      Number(event.target.value)
                    )
                  }
                />

              </div>



              {/* CLEARANCE */}

              <div className="scenario-control">

                <div className="scenario-label">

                  <label>
                    Clearance Delay
                  </label>

                  <strong>
                    {formatNumber(
                      scenario.clearanceDelayMonths
                    )}
                    {" "}
                    months
                  </strong>

                </div>

                <input
                  type="range"
                  min="0"
                  max="36"
                  step="0.1"
                  value={
                    scenario.clearanceDelayMonths
                  }
                  onChange={event =>
                    updateScenario(
                      "clearanceDelayMonths",
                      Number(event.target.value)
                    )
                  }
                />

              </div>



              {/* CONTRACTOR */}

              <div className="scenario-control">

                <div className="scenario-label">

                  <label>
                    Contractor Delay Score
                  </label>

                  <strong>
                    {formatNumber(
                      scenario.contractorDelayScore
                    )}
                    {" "}
                    / 10
                  </strong>

                </div>

                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={
                    scenario.contractorDelayScore
                  }
                  onChange={event =>
                    updateScenario(
                      "contractorDelayScore",
                      Number(event.target.value)
                    )
                  }
                />

              </div>



              {/* GEOLOGICAL */}

              <div className="scenario-control">

                <div className="scenario-label">

                  <label>
                    Geological Delay Score
                  </label>

                  <strong>
                    {formatNumber(
                      scenario.geologicalDelayScore
                    )}
                    {" "}
                    / 10
                  </strong>

                </div>

                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={
                    scenario.geologicalDelayScore
                  }
                  onChange={event =>
                    updateScenario(
                      "geologicalDelayScore",
                      Number(event.target.value)
                    )
                  }
                />

              </div>


            </div>

          )}


          <div className="simulation-notice">

            <AlertTriangle
              size={17}
            />

            <div>

              <strong>
                Simulation Mode
              </strong>

              <span>
                Changes on this page are temporary.
                They do not modify the project or
                Firestore records.
              </span>

            </div>

          </div>


       <button
  type="button"
  className="run-simulation-button"
  onClick={handleRunWhatIf}
  disabled={
    scenarioLoading ||
    !scenario ||
    !selectedProjectId ||
    !latestSnapshot
  }
>
  <BrainCircuit
    size={18}
  />

  {scenarioLoading
    ? "Running Simulation..."
    : "Run What-If Prediction"}
</button>

      <p className="simulation-coming-note">
  {scenarioLoading
    ? "Running the scenario through the trained ML models..."
    : "Scenario changes are temporary and are not saved to Firestore."}
</p>




        </section>

        {/* =====================================================
    WHAT-IF RESULT
===================================================== */}

{scenarioError && (
  <div className="prediction-error-card">
    <AlertTriangle size={18} />

    <div>
      <strong>
        What-If Prediction Failed
      </strong>

      <p>
        {scenarioError}
      </p>
    </div>
  </div>
)}


{scenarioLoading && (
  <section className="prediction-card scenario-result-card">

    <div className="prediction-card-header">

      <div>
        <span className="section-eyebrow">
          AI SIMULATION
        </span>

        <h2>
          Running What-If Prediction
        </h2>

        <p>
          The temporary scenario is being evaluated
          by the trained ML models.
        </p>
      </div>

      <RefreshCw
        size={22}
        className="spin"
      />

    </div>

  </section>
)}


{scenarioPrediction &&
  currentPrediction && (
    <section className="prediction-card scenario-result-card">

      <div className="prediction-card-header">

        <div>

          <span className="section-eyebrow">
            AI SIMULATION RESULT
          </span>

          <h2>
            Current vs What-If Prediction
          </h2>

          <p>
            The scenario result is temporary and
            has not been saved to Firestore.
          </p>

        </div>

        <SlidersHorizontal
          size={22}
        />

      </div>


      <div className="prediction-comparison-grid">

        {/* DELAY */}

        <div className="comparison-metric">

          <div className="comparison-metric-title">
            <Clock3 size={18} />

            <span>
              Predicted Delay
            </span>
          </div>

          <div className="comparison-values">

            <div>
              <span className="comparison-label">
                Current
              </span>

              <strong>
                {formatNumber(
                  currentPrediction.prediction
                    .predicted_delay_months
                )}{" "}
                months
              </strong>
            </div>

            <div>
              <span className="comparison-label">
                What-If
              </span>

              <strong>
                {formatNumber(
                  scenarioPrediction.prediction
                    .predicted_delay_months
                )}{" "}
                months
              </strong>
            </div>

          </div>

          <div className="comparison-change">

            Change:{" "}

            <strong>
              {formatChange(
                getChange(
                  currentPrediction.prediction
                    .predicted_delay_months,

                  scenarioPrediction.prediction
                    .predicted_delay_months
                )
              )}{" "}
              months
            </strong>

          </div>

        </div>


        {/* COST OVERRUN */}

        <div className="comparison-metric">

          <div className="comparison-metric-title">
            <Calculator size={18} />

            <span>
              Cost Overrun
            </span>
          </div>

          <div className="comparison-values">

            <div>
              <span className="comparison-label">
                Current
              </span>

              <strong>
                {formatNumber(
                  currentPrediction.prediction
                    .predicted_cost_overrun_pct
                )}%
              </strong>
            </div>

            <div>
              <span className="comparison-label">
                What-If
              </span>

              <strong>
                {formatNumber(
                  scenarioPrediction.prediction
                    .predicted_cost_overrun_pct
                )}%
              </strong>
            </div>

          </div>

          <div className="comparison-change">

            Change:{" "}

            <strong>
              {formatChange(
                getChange(
                  currentPrediction.prediction
                    .predicted_cost_overrun_pct,

                  scenarioPrediction.prediction
                    .predicted_cost_overrun_pct
                )
              )}%
            </strong>

          </div>

        </div>


        {/* COST AMOUNT */}

        <div className="comparison-metric">

          <div className="comparison-metric-title">
            <IndianRupee size={18} />

            <span>
              Estimated Cost Overrun
            </span>
          </div>

          <div className="comparison-values">

            <div>
              <span className="comparison-label">
                Current
              </span>

              <strong>
                ₹
                {formatNumber(
                  currentPrediction.prediction
                    .predicted_cost_overrun_cr
                )}{" "}
                Cr
              </strong>
            </div>

            <div>
              <span className="comparison-label">
                What-If
              </span>

              <strong>
                ₹
                {formatNumber(
                  scenarioPrediction.prediction
                    .predicted_cost_overrun_cr
                )}{" "}
                Cr
              </strong>
            </div>

          </div>

          <div className="comparison-change">

            Change:{" "}

            <strong>
              ₹
              {formatChange(
                getChange(
                  currentPrediction.prediction
                    .predicted_cost_overrun_cr,

                  scenarioPrediction.prediction
                    .predicted_cost_overrun_cr
                )
              )}{" "}
              Cr
            </strong>

          </div>

        </div>


        {/* RISK */}

        <div className="comparison-metric">

          <div className="comparison-metric-title">
            <ShieldCheck size={18} />

            <span>
              Risk Score
            </span>
          </div>

          <div className="comparison-values">

            <div>
              <span className="comparison-label">
                Current
              </span>

              <strong>
                {formatNumber(
                  currentPrediction.prediction
                    .predicted_risk_score
                )}
              </strong>
            </div>

            <div>
              <span className="comparison-label">
                What-If
              </span>

              <strong>
                {formatNumber(
                  scenarioPrediction.prediction
                    .predicted_risk_score
                )}
              </strong>
            </div>

          </div>

          <div className="comparison-change">

            Change:{" "}

            <strong>
              {formatChange(
                getChange(
                  currentPrediction.prediction
                    .predicted_risk_score,

                  scenarioPrediction.prediction
                    .predicted_risk_score
                )
              )}
            </strong>

          </div>

        </div>

      </div>


      {/* RISK CATEGORY */}

      <div className="scenario-risk-summary">

        <div>

          <span>
            Current Risk
          </span>

          <strong>
            {currentPrediction.prediction
              .risk_category}
          </strong>

        </div>

        <div>

          <span>
            What-If Risk
          </span>

          <strong>
            {scenarioPrediction.prediction
              .risk_category}
          </strong>

        </div>

      </div>


      {/* =====================================================
    SCENARIO IMPACT
===================================================== */}

<div className="scenario-impact">

  <div className="scenario-impact-header">

    <div>
      <span className="section-eyebrow">
        SCENARIO IMPACT
      </span>

      <h3>
        What changed?
      </h3>

      <p>
        Comparison of the simulated scenario
        against the current model prediction.
      </p>
    </div>

  </div>


  <div className="scenario-impact-grid">

    {/* DELAY */}

    {(() => {

      const change = getChange(
        currentPrediction.prediction
          .predicted_delay_months,

        scenarioPrediction.prediction
          .predicted_delay_months
      );

      return (
        <div
          className={`impact-item ${getImpactClass(change)}`}
        >

          <Clock3 size={18} />

          <div>

            <span>
              Schedule Impact
            </span>

            <strong>
              {change !== null && change < 0
                ? `Delay reduced by ${Math.abs(change).toFixed(1)} months`
                : change !== null && change > 0
                  ? `Delay increased by ${change.toFixed(1)} months`
                  : "No predicted delay change"}
            </strong>

          </div>

        </div>
      );

    })()}


    {/* COST */}

    {(() => {

      const change = getChange(
        currentPrediction.prediction
          .predicted_cost_overrun_pct,

        scenarioPrediction.prediction
          .predicted_cost_overrun_pct
      );

      return (
        <div
          className={`impact-item ${getImpactClass(change)}`}
        >

          <IndianRupee size={18} />

          <div>

            <span>
              Financial Impact
            </span>

            <strong>
              {change !== null && change < 0
                ? `Cost overrun reduced by ${Math.abs(change).toFixed(2)}%`
                : change !== null && change > 0
                  ? `Cost overrun increased by ${change.toFixed(2)}%`
                  : "No predicted cost change"}
            </strong>

          </div>

        </div>
      );

    })()}


    {/* RISK */}

    {(() => {

      const change = getChange(
        currentPrediction.prediction
          .predicted_risk_score,

        scenarioPrediction.prediction
          .predicted_risk_score
      );

      return (
        <div
          className={`impact-item ${getImpactClass(change)}`}
        >

          <ShieldCheck size={18} />

          <div>

            <span>
              Risk Impact
            </span>

            <strong>
              {change !== null && change < 0
                ? `Risk score reduced by ${Math.abs(change).toFixed(1)} points`
                : change !== null && change > 0
                  ? `Risk score increased by ${change.toFixed(1)} points`
                  : "No predicted risk change"}
            </strong>

          </div>

        </div>
      );

    })()}

  </div>

</div>


{/* =====================================================
    SCENARIO DRIVERS
===================================================== */}

{latestSnapshot &&
  scenario &&
  scenarioPrediction && (
    <div className="scenario-drivers">

      <div className="scenario-drivers-header">

        <div>

          <span className="section-eyebrow">
            SCENARIO DRIVERS
          </span>

          <h3>
            Why did the prediction change?
          </h3>

          <p>
            These are the scenario inputs that differ
            from the latest project snapshot.
          </p>

        </div>

      </div>


      {getScenarioDrivers(
        latestSnapshot,
        scenario
      ).length === 0 ? (

        <div className="scenario-drivers-empty">

          <ShieldCheck size={20} />

          <div>

            <strong>
              No scenario inputs changed
            </strong>

            <span>
              Run the simulation after modifying
              one or more scenario controls.
            </span>

          </div>

        </div>

      ) : (

        <div className="scenario-driver-list">

          {getScenarioDrivers(
            latestSnapshot,
            scenario
          ).map(driver => (

            <div
              key={driver.label}
              className={`scenario-driver ${driver.direction}`}
            >

              <div className="scenario-driver-indicator">
                {driver.direction === "positive"
                  ? "↓"
                  : driver.direction === "negative"
                    ? "↑"
                    : "•"}
              </div>


              <div className="scenario-driver-content">

                <div className="scenario-driver-top">

                  <strong>
                    {driver.label}
                  </strong>

                  <span>
                    {formatNumber(driver.current, 1)}
                    {driver.unit}
                    {" → "}
                    {formatNumber(driver.scenario, 1)}
                    {driver.unit}
                  </span>

                </div>


                <p>
                  {driver.explanation}
                </p>

              </div>

            </div>

          ))}

        </div>

      )}

    </div>
  )}

      {/* MODEL INFO */}

      <div className="scenario-result-footer">

        <span>
          Model{" "}
          {scenarioPrediction.prediction
            .model_version}
        </span>

        <span>
          {scenarioPrediction.prediction
            .feature_count} features
        </span>

        <span>
          Simulation only
        </span>

      </div>

    </section>
)}


      </div>

    </DashboardLayout>

  );

}


export default Predictions;