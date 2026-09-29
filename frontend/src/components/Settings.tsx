import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import DashboardLayout from "./DashboardLayout";
import "./Settings.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

const PROFILE_NAME_KEY = "neevai.profileName";
const PROFILE_ROLE_KEY = "neevai.profileRole";

function Settings() {
  const [profileName, setProfileName] = useState("Kanchan");
  const [profileRole, setProfileRole] = useState("Administrator");
  const [healthStatus, setHealthStatus] = useState("Checking...");
  const [healthDetail, setHealthDetail] = useState("");
  const [saved, setSaved] = useState(false);

  const loadProfile = () => {
    const storedName = window.localStorage.getItem(PROFILE_NAME_KEY);
    const storedRole = window.localStorage.getItem(PROFILE_ROLE_KEY);

    if (storedName?.trim()) {
      setProfileName(storedName);
    }

    if (storedRole?.trim()) {
      setProfileRole(storedRole);
    }
  };

  const checkHealth = async () => {
    try {
      setHealthStatus("Checking...");
      setHealthDetail("");

      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await response.json();

      if (response.ok && data?.status) {
        setHealthStatus(String(data.status));
        setHealthDetail("Backend health endpoint responded successfully.");
        return;
      }

      setHealthStatus("Unreachable");
      setHealthDetail("The backend did not return a healthy status.");
    } catch {
      setHealthStatus("Unreachable");
      setHealthDetail("Could not reach the backend health endpoint.");
    }
  };

  useEffect(() => {
    loadProfile();
    checkHealth();
  }, []);

  const saveProfile = () => {
    window.localStorage.setItem(PROFILE_NAME_KEY, profileName.trim() || "Kanchan");
    window.localStorage.setItem(PROFILE_ROLE_KEY, profileRole.trim() || "Administrator");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  return (
    <DashboardLayout>
      <div className="settings-page">
        <div className="settings-header">
          <div>
            <h2>Settings</h2>
            <p>Workspace profile and backend connection</p>
          </div>
        </div>

        <div className="settings-grid">
          <section className="settings-card">
            <h3>Profile</h3>
            <p>Shown in the top bar across NeevAI.</p>

            <label>
              Display name
              <input
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
              />
            </label>

            <label>
              Role
              <input
                value={profileRole}
                onChange={(event) => setProfileRole(event.target.value)}
              />
            </label>

            <button type="button" onClick={saveProfile}>
              {saved ? "Saved" : "Save profile"}
            </button>
          </section>

          <section className="settings-card">
            <h3>Backend</h3>
            <p>Connection used by the monitoring dashboard.</p>

            <div className="settings-meta">
              <span>API base URL</span>
              <strong>{API_BASE_URL}</strong>
            </div>

            <div className="settings-meta">
              <span>Health</span>
              <strong className={`settings-health settings-health-${healthStatus.toLowerCase().replace(/[^a-z]/g, "")}`}>
                {healthStatus}
              </strong>
            </div>

            {healthDetail && <p>{healthDetail}</p>}

            <button type="button" onClick={checkHealth}>
              <RefreshCw size={16} />
              Recheck health
            </button>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Settings;
