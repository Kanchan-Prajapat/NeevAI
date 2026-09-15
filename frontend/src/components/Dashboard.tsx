import { useEffect, useState } from "react";

import "./Dashboard.css";
import {
  getDashboardAnalytics,
} from "../services/projectAnalyticsService";

import type {
  DashboardAnalytics,
} from "../services/projectAnalyticsService";
import DashboardLayout from "./DashboardLayout";

import {
  LayoutDashboard,
  Activity,
  AlertTriangle,
  CheckCircle2,
  IndianRupee,
  Wallet,
  ClipboardList,
  RefreshCw,
} from "lucide-react";

function Dashboard() {
  const [analytics, setAnalytics] =
    useState<DashboardAnalytics | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);


  useEffect(() => {
    loadDashboard();
  }, []);


  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const data =
        await getDashboardAnalytics();

      console.log(
        "Dashboard analytics:",
        data
      );

      setAnalytics(data);

    } catch (err) {
      console.error(
        "Failed to load dashboard:",
        err
      );

      setError(
        "Failed to load dashboard data."
      );

    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div>
        <h2>
          Loading Dashboard...
        </h2>
      </div>
    );
  }


  if (error) {
    return (
      <div>
        <h2>
          {error}
        </h2>

        <button
          onClick={loadDashboard}
        >
          Retry
        </button>
      </div>
    );
  }


  if (!analytics) {
    return (
      <div>
        <h2>
          No dashboard data available.
        </h2>
      </div>
    );
  }




    return (
  <DashboardLayout>
    <div className="dashboard-page">

  <div className="dashboard-page-header">
        <div>
          <h2>Overview</h2>

          <p>
            Real-time overview of your infrastructure projects
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={loadDashboard}
        >
          <RefreshCw size={18} />
          Refresh Data
        </button>
      </div>


      {/* PROJECT STATUS CARDS */}

      <div className="summary-grid">

        <div className="summary-card">
          <div className="card-icon">
            <LayoutDashboard size={20} />
          </div>

          <span>Total Projects</span>

          <h3>
            {analytics.totalProjects}
          </h3>

          <p>
            All registered projects
          </p>
        </div>


        <div className="summary-card">
          <div className="card-icon">
            <Activity size={20} />
          </div>

          <span>Ongoing</span>

          <h3>
            {analytics.ongoingProjects}
          </h3>

          <p>
            Currently in progress
          </p>
        </div>


        <div className="summary-card">
          <div className="card-icon warning">
            <AlertTriangle size={20} />
          </div>

          <span>Delayed</span>

          <h3>
            {analytics.delayedProjects}
          </h3>

          <p>
            Projects requiring attention
          </p>
        </div>


        <div className="summary-card">
          <div className="card-icon success">
            <CheckCircle2 size={20} />
          </div>

          <span>Completed</span>

          <h3>
            {analytics.completedProjects}
          </h3>

          <p>
            Successfully completed
          </p>
        </div>

      </div>


 <div className="financial-grid">

  <div className="financial-card">

    <IndianRupee size={22} />

    <div>

      <span>
        Total Project Cost
      </span>

      <h3>

        ₹{" "}

        {analytics.totalBudget.toLocaleString(
          "en-IN"
        )}

      </h3>

    </div>

  </div>


  <div className="financial-card">

    <Wallet size={22} />

    <div>

      <span>
        Total Expenditure
      </span>

      <h3>

        ₹{" "}

        {analytics.totalExpenditure.toLocaleString(
          "en-IN"
        )}

      </h3>

    </div>

  </div>


  <div className="financial-card">

    <ClipboardList size={22} />

    <div>

      <span>
        Average Progress
      </span>

      <h3>

        {analytics.averageProgress.toFixed(
          1
        )}%

      </h3>

    </div>

  </div>


  <div className="financial-card">

    <ClipboardList size={22} />

    <div>

      <span>
        Planned Projects
      </span>

      <h3>
        {analytics.plannedProjects}
      </h3>

    </div>

  </div>

</div>



      {/* RISK OVERVIEW */}

      <section className="risk-section">

        <div className="section-heading">

          <div>
            <h2>Risk Overview</h2>

            <p>
              Project risk distribution based on
              latest prediction data
            </p>
          </div>

        </div>


        <div className="risk-grid">

          <div className="risk-card high-risk">

            <span>High Risk</span>

            <h3>
              {analytics.highRiskProjects}
            </h3>

            <p>
              Immediate attention required
            </p>

          </div>


          <div className="risk-card medium-risk">

            <span>Medium Risk</span>

            <h3>
              {analytics.mediumRiskProjects}
            </h3>

            <p>
              Monitor project performance
            </p>

          </div>


          <div className="risk-card low-risk">

            <span>Low Risk</span>

            <h3>
              {analytics.lowRiskProjects}
            </h3>

            <p>
              Projects performing normally
            </p>

          </div>

        </div>

      </section>


      {/* PROJECT PERFORMANCE */}

<section className="project-section">

  <div className="section-heading">

    <div>
      <h2>
        Project Performance
      </h2>

      <p>
        Latest project status and performance overview
      </p>
    </div>

  </div>


  <div className="project-table-wrapper">

    <table className="project-table">

    <thead>

  <tr>

    <th>
      Project
    </th>
<th>Type</th>

<th>Domain</th>

<th>Implementing Agency</th>

    <th>
      Status
    </th>

    <th>
      Progress
    </th>

    <th>
      Cost
    </th>

    <th>
      Risk
    </th>

    <th>
      AI Data
    </th>

  </tr>

</thead>

   <tbody>

  {analytics.projects.length === 0 ? (

    <tr>

      <td
        colSpan={9}
        className="empty-table"
      >
        No projects available.
      </td>

    </tr>

  ) : (

   analytics.projects
  .slice(0, 10)
  .map((project) => (

    <tr
      key={project.projectId}
    >

      {/* PROJECT */}

      <td>

        <div className="project-name-cell">

          <strong>
            {project.projectName}
          </strong>

          <span>
            {project.projectId}
          </span>

        </div>

      </td>


      {/* TYPE */}

      <td>
        {project.projectType}
      </td>


      {/* DOMAIN */}

      <td>
        {project.domain}
      </td>


      {/* IMPLEMENTING AGENCY */}

      <td>
        {project.implementingAgency}
      </td>


      {/* STATUS */}

      <td>

        <span
          className={`status-badge status-${(
            project.status ??
            "unknown"
          ).toLowerCase()}`}
        >

          {project.status ??
            "No Data"}

        </span>

      </td>


      {/* PROGRESS */}

      <td>

        <div className="progress-cell">

          <div className="progress-bar">

            <div
              className="progress-fill"
              style={{
                width: `${Math.min(
                  Math.max(
                    project.progressPercentage ?? 0,
                    0
                  ),
                  100
                )}%`,
              }}
            />

          </div>

          <span>

            {project.progressPercentage ?? 0}%

          </span>

        </div>

      </td>


      {/* COST */}

      <td>

        ₹{" "}

        {project.budget.toLocaleString(
          "en-IN"
        )}

      </td>


      {/* RISK */}

      <td>

        {project.riskLevel ? (

          <span
            className={`risk-badge risk-${project.riskLevel.toLowerCase()}`}
          >

            {project.riskLevel}

          </span>

        ) : (

          <span
            className="risk-badge risk-unknown"
          >
            No Data
          </span>

        )}

      </td>


      {/* AI DATA */}

      <td>

        {project.dataStatus ? (

          <span
            className={`data-badge data-${project.dataStatus.toLowerCase()}`}
          >

            {project.dataStatus}

          </span>

        ) : (

          <span
            className="data-badge data-unknown"
          >
            No Prediction
          </span>

        )}

      </td>

    </tr>

  ))

  )}

</tbody>


    </table>

  </div>

</section>

    </div>


  </DashboardLayout>
);
}


export default Dashboard;