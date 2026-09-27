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

const [searchTerm, setSearchTerm] =
  useState("");

const [domainFilter, setDomainFilter] =
  useState("All");

const [statusFilter, setStatusFilter] =
  useState("All");

const [riskFilter, setRiskFilter] =
  useState("All");

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


const formatStatusLabel = (
  status?: string
): string => {
  if (!status?.trim()) {
    return "No Data";
  }

  return status
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const uniqueProjects = Array.from(
  new Map(
    analytics.projects.map((project) => [
      project.projectId,
      project,
    ])
  ).values()
);

const filteredProjects = uniqueProjects.filter(
  (project) => {
    const search = searchTerm
      .trim()
      .toLowerCase();

    const matchesSearch =
      !search ||
      project.projectName
        ?.toLowerCase()
        .includes(search) ||
      project.projectId
        ?.toLowerCase()
        .includes(search) ||
      project.implementingAgency
        ?.toLowerCase()
        .includes(search);

    const matchesDomain =
      domainFilter === "All" ||
      project.domain === domainFilter;

    const matchesStatus =
      statusFilter === "All" ||
      project.status?.toLowerCase() ===
        statusFilter.toLowerCase();

    const matchesRisk =
      riskFilter === "All" ||
      project.riskLevel?.toLowerCase() ===
        riskFilter.toLowerCase();

    return (
      matchesSearch &&
      matchesDomain &&
      matchesStatus &&
      matchesRisk
    );
  }
);

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

        {(analytics.totalBudget/ 10000000).toFixed(2)} Cr

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

        {(analytics.totalExpenditure/10000000).toFixed(2)} Cr

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
  latest calculated risk metrics
</p>  
          </div>

        </div>


        <div className="risk-grid">

         <div
  className="risk-card high-risk"
  onClick={() => setRiskFilter("High")}
>

            <span>High Risk</span>

            <h3>
              {analytics.highRiskProjects}
            </h3>

            <p>
              Immediate attention required
            </p>

          </div>


         <div
  className="risk-card medium-risk"
  onClick={() => setRiskFilter("Medium")}
>

            <span>Medium Risk</span>

            <h3>
              {analytics.mediumRiskProjects}
            </h3>

            <p>
              Monitor project performance
            </p>

          </div>


      <div
  className="risk-card low-risk"
  onClick={() => setRiskFilter("Low")}
>

            <span>Low Risk</span>

            <h3>
              {analytics.lowRiskProjects}
            </h3>

            <p>
              Projects performing normally
            </p>

          </div>

      <div
  className="risk-card critical-risk"
  onClick={() => setRiskFilter("Critical")}
>
  <span>Critical Risk</span>

  <h3>
    {analytics.criticalRiskProjects}
  </h3>

  <p>
    Urgent intervention required
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

  <div className="dashboard-filters">

  <div className="filter-search">

    <input
      type="text"
      placeholder="Search project, ID or agency..."
      value={searchTerm}
      onChange={(e) =>
        setSearchTerm(e.target.value)
      }
    />

  </div>


  <select
    value={domainFilter}
    onChange={(e) =>
      setDomainFilter(e.target.value)
    }
  >
    <option value="All">
      All Domains
    </option>

    <option value="Roads & Highways">
      Roads & Highways
    </option>

    <option value="Healthcare">
      Healthcare
    </option>
  </select>


  <select
    value={statusFilter}
    onChange={(e) =>
      setStatusFilter(e.target.value)
    }
  >
    <option value="All">
      All Status
    </option>

    <option value="Ongoing">
      Ongoing
    </option>

    <option value="Completed">
      Completed
    </option>

    <option value="Planned">
      Planned
    </option>
  </select>


  <select
    value={riskFilter}
    onChange={(e) =>
      setRiskFilter(e.target.value)
    }
  >
    <option value="All">
      All Risk Levels
    </option>

    <option value="Low">
      Low
    </option>

    <option value="Medium">
      Medium
    </option>

    <option value="High">
      High
    </option>

    <option value="Critical">
      Critical
    </option>
  </select>


  <button
    className="reset-filter-button"
    onClick={() => {
      setSearchTerm("");
      setDomainFilter("All");
      setStatusFilter("All");
      setRiskFilter("All");
    }}
  >
    Reset
  </button>

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
  Score
</th>

    <th>
      AI Data
    </th>

  </tr>

</thead>

   <tbody>

  {filteredProjects.length === 0? (

    <tr>

      <td
        colSpan={10}
        className="empty-table"
      >
      No projects match the selected filters.
      </td>

    </tr>

  ) : (

  filteredProjects
  .slice(0, 10)
  .map((project) => (

    <tr
      key={project.projectId}
    >

      {/* PROJECT */}

      <td>

        <div className="project-name-cell">

          <strong title={project.projectName}>
            {project.projectName}
          </strong>

          <span title={project.projectId}>
            {project.projectId}
          </span>

        </div>

      </td>


      {/* TYPE */}

      <td title={project.projectType}>
        {project.projectType}
      </td>


      {/* DOMAIN */}

      <td title={project.domain}>
        {project.domain}
      </td>


      {/* IMPLEMENTING AGENCY */}

      <td title={project.implementingAgency}>
        {project.implementingAgency}
      </td>


      {/* STATUS */}

      <td>

        <span
          className={`status-badge status-${(
            project.status ??
            "unknown"
          ).trim().toLowerCase()}`}
        >

          {formatStatusLabel(project.status)}

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
  <span
    className="cost-cell"
    title={`₹ ${(project.budget / 10000000).toFixed(2)} Cr`}
  >
    ₹ {(project.budget / 10000000).toFixed(2)} Cr
  </span>
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


      {/* RISK SCORE */}

<td>

  {typeof project.riskScore === "number" ? (

    <span className="risk-score">

      {project.riskScore.toFixed(1)}

    </span>

  ) : (

    <span className="risk-score unknown">
      —
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