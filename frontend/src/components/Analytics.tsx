import {
  useEffect,
  useState,
} from "react";

import DashboardLayout from "./DashboardLayout";

import {
  RefreshCw,
  BarChart3,
  IndianRupee,
  Wallet,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CirclePause,
} from "lucide-react";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import {
  getDashboardAnalytics,
} from "../services/projectAnalyticsService";

import type {
  DashboardAnalytics,
} from "../services/projectAnalyticsService";

import "./Analytics.css";


function Analytics() {

  const [
    analytics,
    setAnalytics,
  ] = useState<
    DashboardAnalytics | null
  >(null);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);


  /* =========================================
     LOAD ANALYTICS
  ========================================= */

  const loadAnalytics =
    async () => {

      try {

        setLoading(true);

        setError(null);


        const data =
          await getDashboardAnalytics();


        console.log(
          "Analytics data:",
          data
        );


        setAnalytics(data);

      } catch (
        err
      ) {

        console.error(
          "Failed to load analytics:",
          err
        );


        setError(
          "Failed to load analytics data."
        );

      } finally {

        setLoading(false);

      }

    };


  /* =========================================
     INITIAL LOAD
  ========================================= */

  useEffect(() => {

    loadAnalytics();

  }, []);


  /* =========================================
     LOADING STATE
  ========================================= */

  if (loading) {

    return (

      <DashboardLayout>

        <div className="analytics-page">

          <div className="analytics-message">

            Loading analytics...

          </div>

        </div>

      </DashboardLayout>

    );

  }


  /* =========================================
     ERROR STATE
  ========================================= */

  if (error) {

    return (

      <DashboardLayout>

        <div className="analytics-page">

          <div className="analytics-message analytics-error">

            <p>
              {error}
            </p>


            <button
              type="button"
              onClick={loadAnalytics}
            >

              Retry

            </button>

          </div>

        </div>

      </DashboardLayout>

    );

  }


  /* =========================================
     EMPTY STATE
  ========================================= */

  if (!analytics) {

    return (

      <DashboardLayout>

        <div className="analytics-page">

          <div className="analytics-message">

            No analytics data available.

          </div>

        </div>

      </DashboardLayout>

    );

  }


/* =========================================
   STATUS CHART DATA
========================================= */

const statusChartData = [

  {
    name: "Planned",
    value: analytics.plannedProjects,
    color: "#3B82F6",
  },

  {
    name: "Ongoing",
    value: analytics.ongoingProjects,
    color: "#F59E0B",
  },

  {
    name: "Delayed",
    value: analytics.delayedProjects,
    color: "#EF4444",
  },

  {
    name: "Completed",
    value: analytics.completedProjects,
    color: "#22C55E",
  },

  {
    name: "Stalled",
    value: analytics.stalledProjects,
    color: "#64748B",
  },

];


const hasStatusData =
  statusChartData.some(
    (item) => item.value > 0
  );



  return (

    <DashboardLayout>

      <div className="analytics-page">


        {/* =====================================
           PAGE HEADER
        ===================================== */}

        <div className="analytics-header">

          <div>

            <div className="analytics-title-row">

              <div className="analytics-title-icon">

                <BarChart3
                  size={22}
                />

              </div>


              <div>

                <h1>
                  Analytics
                </h1>


                <p>

                  Project performance, financial
                  insights and risk analysis

                </p>

              </div>

            </div>

          </div>


          <button
            type="button"
            className="analytics-refresh-button"
            onClick={loadAnalytics}
          >

            <RefreshCw
              size={17}
            />

            Refresh Data

          </button>

        </div>



        {/* =====================================
           PRIMARY METRICS
        ===================================== */}

        <section className="analytics-metrics-grid">


          {/* TOTAL PROJECTS */}

          <div className="analytics-metric-card">

            <div className="metric-icon">

              <BarChart3
                size={21}
              />

            </div>


            <div>

              <span>
                Total Projects
              </span>


              <h2>
                {analytics.totalProjects}
              </h2>

            </div>

          </div>



          {/* TOTAL BUDGET */}

          <div className="analytics-metric-card">

            <div className="metric-icon metric-icon-primary">

              <IndianRupee
                size={21}
              />

            </div>


            <div>

              <span>
                Total Budget
              </span>


              <h2>

                ₹{" "}

                {analytics.totalBudget.toLocaleString(
                  "en-IN"
                )}

              </h2>

            </div>

          </div>



          {/* TOTAL EXPENDITURE */}

          <div className="analytics-metric-card">

            <div className="metric-icon metric-icon-info">

              <Wallet
                size={21}
              />

            </div>


            <div>

              <span>
                Total Expenditure
              </span>


              <h2>

                ₹{" "}

                {analytics.totalExpenditure.toLocaleString(
                  "en-IN"
                )}

              </h2>

            </div>

          </div>



          {/* AVERAGE PROGRESS */}

          <div className="analytics-metric-card">

            <div className="metric-icon metric-icon-success">

              <Activity
                size={21}
              />

            </div>


            <div>

              <span>
                Average Progress
              </span>


              <h2>

                {analytics.averageProgress.toFixed(
                  1
                )}

                %

              </h2>

            </div>

          </div>

        </section>

{/* =====================================
   STATUS DISTRIBUTION CHART
===================================== */}

<section className="analytics-chart-section">


  {/* CHART CARD */}

  <div className="analytics-chart-card">


    <div className="analytics-chart-header">

      <div>

        <h2>
          Project Status Overview
        </h2>

        <p>
          Distribution of projects
          across current statuses
        </p>

      </div>

    </div>



    <div className="status-chart-content">


      {/* DONUT CHART */}

      <div className="status-chart-container">

        {hasStatusData ? (

          <ResponsiveContainer
            width="100%"
            height={300}
          >

            <PieChart>

              <Pie
                data={statusChartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={72}
                outerRadius={105}
                paddingAngle={4}
                stroke="none"
              >

                {statusChartData.map(
                  (entry) => (

                    <Cell
                      key={entry.name}
                      fill={entry.color}
                    />

                  )
                )}

              </Pie>


              <Tooltip
                contentStyle={{
                  background:
                    "#172554",

                  border:
                    "1px solid rgba(148, 163, 184, 0.18)",

                  borderRadius:
                    "10px",

                  color:
                    "#F8FAFC",
                }}
              />

            </PieChart>

          </ResponsiveContainer>

        ) : (

          <div className="chart-empty-state">

            No project status data available.

          </div>

        )}

      </div>



      {/* LEGEND */}

      <div className="status-chart-legend">

        {statusChartData.map(
          (item) => (

            <div
              className="chart-legend-item"
              key={item.name}
            >

              <span
                className="chart-legend-color"
                style={{
                  backgroundColor:
                    item.color,
                }}
              />


              <span
                className="chart-legend-label"
              >

                {item.name}

              </span>


              <strong>

                {item.value}

              </strong>

            </div>

          )
        )}

      </div>


    </div>


  </div>


  {/* PORTFOLIO OVERVIEW */}

  <div className="portfolio-overview-card">


    <div className="analytics-chart-header">

      <div>

        <h2>
          Portfolio Overview
        </h2>

        <p>
          Key portfolio performance indicators
        </p>

      </div>

    </div>


    <div className="portfolio-overview-list">


      <div className="portfolio-overview-item">

        <span>
          Completion Rate
        </span>

        <strong>

          {analytics.totalProjects > 0
            ? (
                (
                  analytics.completedProjects /
                  analytics.totalProjects
                ) * 100
              ).toFixed(1)
            : "0.0"}

          %

        </strong>

      </div>



      <div className="portfolio-overview-item">

        <span>
          Average Progress
        </span>

        <strong>

          {analytics.averageProgress.toFixed(1)}%

        </strong>

      </div>



      <div className="portfolio-overview-item">

        <span>
          Ongoing Projects
        </span>

        <strong>

          {analytics.ongoingProjects}

        </strong>

      </div>



      <div className="portfolio-overview-item portfolio-delayed">

        <span>
          Delayed Projects
        </span>

        <strong>

          {analytics.delayedProjects}

        </strong>

      </div>


    </div>


  </div>


</section>

        {/* =====================================
           PROJECT STATUS
        ===================================== */}

        <section className="analytics-section">

          <div className="analytics-section-header">

            <div>

              <h2>
                Project Status Distribution
              </h2>


              <p>

                Current distribution of projects
                by their latest status

              </p>

            </div>

          </div>


          <div className="status-analytics-grid">


            <div className="status-analytics-card status-planned-card">

              <div className="status-card-icon">

                <Clock3
                  size={20}
                />

              </div>


              <span>
                Planned
              </span>


              <strong>

                {analytics.plannedProjects}

              </strong>

            </div>



            <div className="status-analytics-card status-ongoing-card">

              <div className="status-card-icon">

                <Activity
                  size={20}
                />

              </div>


              <span>
                Ongoing
              </span>


              <strong>

                {analytics.ongoingProjects}

              </strong>

            </div>



            <div className="status-analytics-card status-delayed-card">

              <div className="status-card-icon">

                <AlertTriangle
                  size={20}
                />

              </div>


              <span>
                Delayed
              </span>


              <strong>

                {analytics.delayedProjects}

              </strong>

            </div>



            <div className="status-analytics-card status-completed-card">

              <div className="status-card-icon">

                <CheckCircle2
                  size={20}
                />

              </div>


              <span>
                Completed
              </span>


              <strong>

                {analytics.completedProjects}

              </strong>

            </div>



            <div className="status-analytics-card status-stalled-card">

              <div className="status-card-icon">

                <CirclePause
                  size={20}
                />

              </div>


              <span>
                Stalled
              </span>


              <strong>

                {analytics.stalledProjects}

              </strong>

            </div>


          </div>

        </section>



        {/* =====================================
           RISK ANALYTICS
        ===================================== */}

        <section className="analytics-section">

          <div className="analytics-section-header">

            <div>

              <h2>
                Risk Distribution
              </h2>


              <p>

                AI prediction-based project
                risk classification

              </p>

            </div>

          </div>


          <div className="risk-analytics-grid">


            <div className="risk-analytics-card risk-high">

              <div>

                <span>
                  High Risk
                </span>


                <strong>

                  {analytics.highRiskProjects}

                </strong>

              </div>


              <p>

                Projects requiring
                immediate attention

              </p>

            </div>



            <div className="risk-analytics-card risk-medium">

              <div>

                <span>
                  Medium Risk
                </span>


                <strong>

                  {analytics.mediumRiskProjects}

                </strong>

              </div>


              <p>

                Projects requiring
                continuous monitoring

              </p>

            </div>



            <div className="risk-analytics-card risk-low">

              <div>

                <span>
                  Low Risk
                </span>


                <strong>

                  {analytics.lowRiskProjects}

                </strong>

              </div>


              <p>

                Projects performing
                within expected conditions

              </p>

            </div>


          </div>

        </section>


      </div>

    </DashboardLayout>

  );

}


export default Analytics;