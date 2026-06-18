export default function Inventory({ data }) {
  return (
    <div className="bg-white p-5 rounded shadow">

      <h2 className="font-semibold mb-3">Low Stock Inventory</h2>

      {data.lowStock.length === 0 ? (
        <p>No low stock items</p>
      ) : (
        data.lowStock.map(item => (
          <div key={item._id} className="flex justify-between border-b py-2">
            <span>{item.drug?.name}</span>
            <span className="text-red-500">{item.quantity}</span>
          </div>
        ))
      )}

    </div>
  );
}