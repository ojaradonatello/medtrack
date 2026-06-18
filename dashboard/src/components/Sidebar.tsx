import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();

  const menu = [
    { name: "Dashboard", path: "/" },
    { name: "Inventory", path: "/inventory" },
    { name: "Alerts", path: "/alerts" },
  ];

  return (
    <div className="w-64 bg-white shadow-lg p-5 min-h-screen">

      <h1 className="text-xl font-bold mb-6">MedTrack Admin</h1>

      {menu.map(item => (
        <Link
          key={item.path}
          to={item.path}
          className={`block p-2 rounded mb-2 ${
            location.pathname === item.path
              ? "bg-blue-500 text-white"
              : "hover:bg-gray-200"
          }`}
        >
          {item.name}
        </Link>
      ))}

    </div>
  );
}