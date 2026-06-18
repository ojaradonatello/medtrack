import { useEffect, useState } from "react";
import axios from "axios";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Alerts from "./pages/Alerts";

export default function App() {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get("http://localhost:5000/api/dashboard")
      .then(res => setData(res.data))
      .catch(err => console.error(err));
  }, []);

  if (!data) return <p className="p-6">Loading...</p>;

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-gray-100">

        {/* SIDEBAR */}
        <Sidebar />

        {/* CONTENT */}
        <div className="flex-1 p-6">

          <Routes>

            <Route
              path="/"
              element={<Dashboard data={data} />}
            />

            <Route
              path="/inventory"
              element={<Inventory data={data} />}
            />

            <Route
              path="/alerts"
              element={<Alerts data={data} />}
            />

          </Routes>

        </div>

      </div>
    </BrowserRouter>
  );
}