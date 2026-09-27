import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Dashboard from "./components/Dashboard";
import Projects from "./components/Projects";
import Analytics from "./components/Analytics";
import Predictions from "./components/Predictions";
import Reports from "./components/Reports";
import Settings from "./components/Settings";


function App() {

  return (

    <BrowserRouter>

      <Routes>


        {/* DASHBOARD */}

        <Route
          path="/"
          element={<Dashboard />}
        />


        {/* PROJECTS */}

        <Route
          path="/projects"
          element={<Projects />}
        />



        <Route
          path="/analytics"
          element={<Analytics />}
        />


        {/* PREDICTIONS */}

<Route
  path="/predictions"
  element={<Predictions />}
/>


        <Route
          path="/reports"
          element={<Reports />}
        />


        <Route
          path="/settings"
          element={<Settings />}
        />


      </Routes>

    </BrowserRouter>

  );

}


export default App;