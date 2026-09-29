import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  RefreshCw,
  Download,
} from "lucide-react";

import DashboardLayout from "./DashboardLayout";
import {
  getDashboardAnalytics,
} from "../services/projectAnalyticsService";
import type {
  DashboardAnalytics,
  ProjectDashboardItem,
} from "../services/projectAnalyticsService";

import "./Reports.css";

const formatStatusLabel = (status?: string): string => {
  if (!status?.trim()) {
    return "No Data";
  }

  return status
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

function Reports() {
  const navigate = useNavigate();

  const [analytics, setAnalytics] =
    useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReports = async (force = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDashboardAnalytics(force);
      setAnalytics(data);
    } catch (err) {
      console.error("Failed to load reports:", err);
      setError("Failed to load reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const watchlist = useMemo(() => {
    if (!analytics) {
      return [];
    }

    return analytics.projects
      .filter((project) => {
        const risk = project.riskLevel?.toLowerCase();
        return risk === "high" || risk === "critical";
      })
      .sort((left, right) => {
        return (right.riskScore ?? 0) - (left.riskScore ?? 0);
      });
  }, [analytics]);

  const exportCsv = () => {
    if (!analytics) {
      return;
    }

    const rows = [
      [
        "Project ID",
        "Project Name",
        "Type",
        "Domain",
        "Agency",
        "Status",
        "Progress %",
        "Cost Cr",
        "Risk",
        "Score",
      ],
      ...analytics.projects.map((project: ProjectDashboardItem) => [
        project.projectId,
        project.projectName,
        project.projectType ?? "",
        project.domain ?? "",
        project.implementingAgency ?? "",
        formatStatusLabel(project.status),
        String(project.progressPercentage ?? 0),
        (project.budget / 10000000).toFixed(2),
        project.riskLevel ?? "No Data",
        typeof project.riskScore === "number"
          ? project.riskScore.toFixed(1)
          : "",
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "neevai-project-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="reports-page">
        <div className="reports-header">
          <div>
            <h2>Reports</h2>
            <p>
              Export monitoring summaries and review high-priority projects
            </p>
          </div>

          <div className="reports-header-actions">
            <button
              type="button"
              className="reports-secondary-button"
              onClick={() => loadReports(true)}
            >
              <RefreshCw size={17} />
              Refresh
            </button>

            <button
              type="button"
              className="reports-primary-button"
              onClick={exportCsv}
              disabled={!analytics}
            >
              <Download size={17} />
              Export CSV
            </button>
          </div>
        </div>

        {loading && (
          <div className="reports-message">Loading reports...</div>
        )}

        {!loading && error && (
          <div className="reports-message error">
            <p>{error}</p>
            <button type="button" onClick={() => loadReports(true)}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && analytics && (
          <>
            <div className="reports-summary-grid">
              <div className="reports-summary-card">
                <span>Total Projects</span>
                <h3>{analytics.totalProjects}</h3>
              </div>
              <div className="reports-summary-card">
                <span>High Risk</span>
                <h3>{analytics.highRiskProjects}</h3>
              </div>
              <div className="reports-summary-card">
                <span>Critical Risk</span>
                <h3>{analytics.criticalRiskProjects}</h3>
              </div>
              <div className="reports-summary-card">
                <span>Average Progress</span>
                <h3>{analytics.averageProgress.toFixed(1)}%</h3>
              </div>
            </div>

            <section className="reports-watchlist">
              <div className="reports-section-heading">
                <div>
                  <h3>Priority Watchlist</h3>
                  <p>High and critical risk projects ranked by score</p>
                </div>
              </div>

              {watchlist.length === 0 ? (
                <div className="reports-empty">
                  No high or critical risk projects in the current dataset.
                </div>
              ) : (
                <div className="reports-table-wrapper">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Project</th>
                        <th>Agency</th>
                        <th>Status</th>
                        <th>Progress</th>
                        <th>Risk</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {watchlist.map((project) => (
                        <tr
                          key={project.projectId}
                          onClick={() =>
                            navigate(
                              `/projects?open=${encodeURIComponent(
                                project.projectId
                              )}`
                            )
                          }
                        >
                          <td>
                            <strong title={project.projectName}>
                              {project.projectName}
                            </strong>
                            <span>{project.projectId}</span>
                          </td>
                          <td title={project.implementingAgency}>
                            {project.implementingAgency ?? "No Data"}
                          </td>
                          <td>{formatStatusLabel(project.status)}</td>
                          <td>{project.progressPercentage ?? 0}%</td>
                          <td>
                            <span
                              className={`reports-risk reports-risk-${(
                                project.riskLevel ?? "unknown"
                              ).toLowerCase()}`}
                            >
                              {project.riskLevel}
                            </span>
                          </td>
                          <td>
                            {typeof project.riskScore === "number"
                              ? project.riskScore.toFixed(1)
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default Reports;
