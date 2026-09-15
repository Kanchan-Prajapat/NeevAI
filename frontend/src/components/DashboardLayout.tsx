import type { ReactNode } from "react";

import {
  NavLink,
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

import "./DashboardLayout.css";


interface DashboardLayoutProps {
  children: ReactNode;
}


function DashboardLayout({
  children,
}: DashboardLayoutProps) {

  return (

    <div className="dashboard-layout">


      {/* SIDEBAR */}

      <aside className="sidebar">


        {/* LOGO */}

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



        {/* NAVIGATION */}

        <nav className="sidebar-nav">


          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `nav-item ${
                isActive
                  ? "active"
                  : ""
              }`
            }
          >

            <LayoutDashboard
              size={20}
            />

            <span>
              Dashboard
            </span>

          </NavLink>



          <NavLink
            to="/projects"
            className={({ isActive }) =>
              `nav-item ${
                isActive
                  ? "active"
                  : ""
              }`
            }
          >

            <FolderKanban
              size={20}
            />

            <span>
              Projects
            </span>

          </NavLink>



          <button
            className="nav-item"
          >

           <NavLink
            to="/analytics"
            className={({ isActive }) =>
              `nav-item ${
                isActive
                  ? "active"
                  : ""
              }`
            }
          >

            <BarChart3
              size={20}
            />

            <span>
              Analytics
            </span>
            </NavLink>

          </button>



          <button
            className="nav-item"
          >

            <TriangleAlert
              size={20}
            />

            <span>
              Predictions
            </span>

          </button>



          <button
            className="nav-item"
          >

            <FileText
              size={20}
            />

            <span>
              Reports
            </span>

          </button>


        </nav>



        {/* FOOTER */}

        <div className="sidebar-footer">


          <button
            className="nav-item"
          >

            <Settings
              size={20}
            />

            <span>
              Settings
            </span>

          </button>


        </div>


      </aside>



      {/* MAIN AREA */}

      <main className="dashboard-main">


        {/* HEADER */}

        <header className="dashboard-header">


          <div className="header-title">

            <h1>
              Project Dashboard
            </h1>

            <p>
              Monitor projects, performance and risk insights
            </p>

          </div>



          <div className="header-actions">


            <button
              className="notification-button"
            >

              <Bell
                size={20}
              />

            </button>



            <div className="profile-section">


              <div className="profile-avatar">

                K

              </div>



              <div className="profile-info">

                <strong>
                  Kanchan
                </strong>

                <span>
                  Administrator
                </span>

              </div>


            </div>


          </div>


        </header>



        {/* PAGE CONTENT */}

        <div className="dashboard-content">

          {children}

        </div>


      </main>


    </div>

  );

}


export default DashboardLayout;