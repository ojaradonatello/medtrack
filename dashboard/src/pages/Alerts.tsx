export default function Alerts({ data }) {
  return (
    <div className="bg-white p-5 rounded shadow">

      <h2 className="font-semibold mb-3">System Alerts</h2>

      {data.alerts.length === 0 ? (
        <p>No alerts</p>
      ) : (
        data.alerts.map(a => (
          <div key={a._id} className="border-b py-2 text-sm">
            {a.message}
          </div>
        ))
      )}

    </div>
  );
}