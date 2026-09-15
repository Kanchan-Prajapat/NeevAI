import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Dashboard from "./components/Dashboard";

import Projects from "./components/Projects";
import Analytics from "./components/Analytics";


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


      </Routes>

    </BrowserRouter>

  );

}


export default App;