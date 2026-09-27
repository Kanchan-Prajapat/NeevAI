import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  NavLink,
  useLocation,
} from "react-router-dom";

import {
  LayoutDashboard,
  FolderKanban,
  BarChart3,
  TriangleAlert,
  FileText,
  Settings,
  Bell,
} from "lucide-react";

import {
  getDashboardAnalytics,
} from "../services/projectAnalyticsService";

import "./DashboardLayout.css";

interface DashboardLayoutProps {
  children: ReactNode;
}

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "Project Dashboard",
    subtitle: "Monitor projects, performance and risk insights",
  },
  "/projects": {
    title: "Projects",
    subtitle: "Search, open and manage infrastructure projects",
  },
  "/analytics": {
    title: "Analytics",
    subtitle: "Compare progress, spend and risk across the portfolio",
  },
  "/predictions": {
    title: "Predictions",
    subtitle: "Review overrun forecasts and early-warning signals",
  },
  "/reports": {
    title: "Reports",
    subtitle: "Export monitoring summaries and priority watchlists",
  },
  "/settings": {
    title: "Settings",
    subtitle: "Workspace profile and backend connection",
  },
};

const PROFILE_NAME_KEY = "neevai.profileName";
const PROFILE_ROLE_KEY = "neevai.profileRole";

function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const location = useLocation();
  const notificationRef = useRef<HTMLDivElement | null>(null);

  const [profileName, setProfileName] = useState("Kanchan");
  const [profileRole, setProfileRole] = useState("Administrator");
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);

  const pageMeta = useMemo(() => {
    const exact = PAGE_META[location.pathname];

    if (exact) {
      return exact;
    }

    return PAGE_META["/"];
  }, [location.pathname]);

  useEffect(() => {
    const storedName = window.localStorage.getItem(PROFILE_NAME_KEY);
    const storedRole = window.localStorage.getItem(PROFILE_ROLE_KEY);

    if (storedName?.trim()) {
      setProfileName(storedName);
    }

    if (storedRole?.trim()) {
      setProfileRole(storedRole);
    }
  }, [location.pathname]);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const analytics = await getDashboardAnalytics();
        const alerts: string[] = [];

        if (analytics.criticalRiskProjects > 0) {
          alerts.push(
            `${analytics.criticalRiskProjects} project${analytics.criticalRiskProjects === 1 ? "" : "s"} marked critical risk.`
          );
        }

        if (analytics.highRiskProjects > 0) {
          alerts.push(
            `${analytics.highRiskProjects} high-risk project${analytics.highRiskProjects === 1 ? "" : "s"} need review.`
          );
        }

        const stalled = analytics.projects.filter(
          (project) => project.status?.trim().toLowerCase() === "stalled"
        ).length;

        if (stalled > 0) {
          alerts.push(
            `${stalled} stalled project${stalled === 1 ? "" : "s"} in the current portfolio.`
          );
        }

        setNotifications(
          alerts.length > 0
            ? alerts
            : ["No new risk alerts in the current project set."]
        );
      } catch {
        setNotifications(["Could not load notification alerts."]);
      }
    };

    loadNotifications();
  }, []);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, []);

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">
            N
          </div>

          <div>
            <h2>
              NeevAI
            </h2>

            <span>
              Project Intelligence
            </span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/projects"
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <FolderKanban size={20} />
            <span>Projects</span>
          </NavLink>

          <NavLink
            to="/analytics"
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <BarChart3 size={20} />
            <span>Analytics</span>
          </NavLink>

          <NavLink
            to="/predictions"
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <TriangleAlert size={20} />
            <span>Predictions</span>
          </NavLink>

          <NavLink
            to="/reports"
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <FileText size={20} />
            <span>Reports</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <Settings size={20} />
            <span>Settings</span>
          </NavLink>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-title">
            <h1>
              {pageMeta.title}
            </h1>

            <p>
              {pageMeta.subtitle}
            </p>
          </div>

          <div className="header-actions">
            <div
              className="notification-wrap"
              ref={notificationRef}
            >
              <button
                type="button"
                className="notification-button"
                onClick={() =>
                  setShowNotifications((current) => !current)
                }
                aria-label="Open notifications"
              >
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className="notification-dot" />
                )}
              </button>

              {showNotifications && (
                <div className="notification-panel">
                  <strong>Alerts</strong>
                  {notifications.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              )}
            </div>

            <div className="profile-section">
              <div className="profile-avatar">
                {(profileName.trim()[0] || "K").toUpperCase()}
              </div>

              <div className="profile-info">
                <strong>
                  {profileName}
                </strong>

                <span>
                  {profileRole}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          {children}
        </div>
      </main>
    </div>
  );
}

export default DashboardLayout;
