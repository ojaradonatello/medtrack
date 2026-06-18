import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";

export default function Dashboard({ data }) {
  return (
    <>
      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

        <div className="bg-white p-5 rounded shadow">
          <p>Total Stock</p>
          <h2 className="text-2xl font-bold">{data.totalStock}</h2>
        </div>

        <div className="bg-white p-5 rounded shadow">
          <p>Total Drugs</p>
          <h2 className="text-2xl font-bold">{data.totalDrugs}</h2>
        </div>

        <div className="bg-white p-5 rounded shadow">
          <p>Dispensed Today</p>
          <h2 className="text-2xl font-bold">{data.totalDispensedToday}</h2>
        </div>

      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* LINE */}
        <div className="bg-white p-5 rounded shadow">
          <h2 className="font-semibold mb-3">Daily Usage</h2>

          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.dailyUsage || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="_id" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* BAR */}
        <div className="bg-white p-5 rounded shadow">
          <h2 className="font-semibold mb-3">Top Drugs</h2>

          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.topDrugs || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </>
  );
}